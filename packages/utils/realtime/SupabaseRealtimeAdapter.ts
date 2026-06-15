import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeManager, RealtimeOptions, RealtimeHandler, Unsubscribe } from "./RealtimeManager";

interface Subscription {
    channel: RealtimeChannel;
    handlers: Map<string, RealtimeHandler[]>;
    unsubscribeCallbacks: Array<() => Promise<void>>;
}

export class SupabaseRealtimeAdapter implements RealtimeManager {
    private supabase: any;
    private subscriptions = new Map<string, Subscription>();
    private connected = false;
    private connectionHandlers = new Set<(connected: boolean) => void>();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
        this.setupConnectionMonitoring();
    }

    private setupConnectionMonitoring() {
        if (!this.supabase.realtime) return;

        // Monitor Supabase realtime connection state
        this.supabase.realtime.onopen = () => {
            this.setConnected(true);
            this.reconnectAttempts = 0;
        };

        this.supabase.realtime.onclose = () => {
            this.setConnected(false);
            this.attemptReconnect();
        };
    }

    private setConnected(connected: boolean) {
        if (this.connected === connected) return;
        this.connected = connected;
        this.connectionHandlers.forEach((handler) => handler(connected));
    }

    private async attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn(
                `[Realtime] Max reconnection attempts reached (${this.maxReconnectAttempts}). Fallback to polling.`
            );
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
            this.reconnect().catch((err) => {
                console.error("[Realtime] Reconnection failed:", err);
            });
        }, delay);
    }

    async subscribe(
        options: RealtimeOptions,
        handler: RealtimeHandler
    ): Promise<Unsubscribe> {
        const { channel: channelName, event } = options;
        const key = `${channelName}:${event}`;

        // Get or create subscription
        if (!this.subscriptions.has(channelName)) {
            const channel = this.supabase.channel(channelName);
            this.subscriptions.set(channelName, {
                channel,
                handlers: new Map(),
                unsubscribeCallbacks: [],
            });
        }

        const subscription = this.subscriptions.get(channelName)!;

        // Add handler
        if (!subscription.handlers.has(event)) {
            subscription.handlers.set(event, []);
        }
        subscription.handlers.get(event)!.push(handler);

        // Subscribe to event if first time
        if (subscription.handlers.get(event)!.length === 1) {
            subscription.channel.on("broadcast", { event }, (payload: any) => {
                const handlers = subscription.handlers.get(event) || [];
                handlers.forEach((h) => {
                    try {
                        h(payload.payload);
                    } catch (err) {
                        console.error(`[Realtime] Handler error for ${event}:`, err);
                    }
                });
            });

            await subscription.channel.subscribe();
        }

        // Return unsubscribe function
        const unsubscribe: Unsubscribe = async () => {
            const handlers = subscription.handlers.get(event) || [];
            const idx = handlers.indexOf(handler);
            if (idx > -1) {
                handlers.splice(idx, 1);
            }

            // Unsubscribe channel if no more handlers
            if (handlers.length === 0 && subscription.handlers.size === 0) {
                await subscription.channel.unsubscribe();
                this.subscriptions.delete(channelName);
            }
        };

        subscription.unsubscribeCallbacks.push(unsubscribe);
        return unsubscribe;
    }

    async broadcast(options: RealtimeOptions, data: any): Promise<void> {
        const { channel, event } = options;

        if (!this.connected) {
            console.warn(`[Realtime] Not connected. Queueing broadcast for ${channel}:${event}`);
        }

        try {
            await this.supabase.channel(channel).send({
                type: "broadcast",
                event,
                payload: data,
            });
        } catch (err) {
            console.error(`[Realtime] Broadcast failed for ${channel}:${event}:`, err);
            throw err;
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    async onConnectionChange(handler: (connected: boolean) => void): Promise<Unsubscribe> {
        this.connectionHandlers.add(handler);
        handler(this.connected); // Emit current state

        return async () => {
            this.connectionHandlers.delete(handler);
        };
    }

    async reconnect(): Promise<void> {
        try {
            if (this.supabase.realtime?.socket) {
                this.supabase.realtime.socket.connect();
            }
            this.setConnected(true);
        } catch (err) {
            console.error("[Realtime] Reconnection failed:", err);
            this.attemptReconnect();
            throw err;
        }
    }

    /**
     * Cleanup all subscriptions
     */
    async cleanup() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        for (const subscription of this.subscriptions.values()) {
            await subscription.channel.unsubscribe();
        }
        this.subscriptions.clear();
        this.connectionHandlers.clear();
    }
}
