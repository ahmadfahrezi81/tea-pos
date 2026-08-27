type RealtimeChannel = any;
import type { RealtimeManager, RealtimeOptions, RealtimeHandler, Unsubscribe } from "./RealtimeManager";

interface Subscription {
    channel: RealtimeChannel;
    handlers: Map<string, RealtimeHandler[]>;
    /** Whether `channel.subscribe()` has been called. Joining is per channel. */
    joined: boolean;
}

/**
 * Connection state comes from the channel status callback and nowhere else.
 *
 * `supabase.realtime` is a `RealtimeClient`, and it has no `onopen`/`onclose` of
 * its own — it sets `conn.onopen` on the underlying WebSocket. Assigning those
 * names on the client writes unused properties, which is what this adapter did
 * until task 062: `connected` was initialised false and never changed, so every
 * consumer saw realtime as permanently down and took its fallback path.
 *
 * `RealtimeChannel.subscribe(callback)` reports `SUBSCRIBED` / `CLOSED` /
 * `CHANNEL_ERROR` / `TIMED_OUT`, which is the real signal.
 */
export class SupabaseRealtimeAdapter implements RealtimeManager {
    private supabase: any;
    private subscriptions = new Map<string, Subscription>();
    private connected = false;
    private connectionHandlers = new Set<(connected: boolean) => void>();
    /** Channels currently reporting SUBSCRIBED. `connected` is `size > 0`. */
    private liveChannels = new Set<string>();

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
    }

    private setConnected(connected: boolean) {
        if (this.connected === connected) return;
        this.connected = connected;
        this.connectionHandlers.forEach((handler) => handler(connected));
    }

    private syncConnected() {
        this.setConnected(this.liveChannels.size > 0);
    }

    async subscribe(
        options: RealtimeOptions,
        handler: RealtimeHandler
    ): Promise<Unsubscribe> {
        const { channel: channelName, event } = options;

        let subscription = this.subscriptions.get(channelName);
        if (!subscription) {
            // `supabase.channel(topic)` returns the existing channel for a topic
            // it already holds, so this never duplicates one.
            subscription = {
                channel: this.supabase.channel(channelName),
                handlers: new Map(),
                joined: false,
            };
            this.subscriptions.set(channelName, subscription);
        }

        const sub = subscription;

        if (!sub.handlers.has(event)) {
            sub.handlers.set(event, []);

            // Broadcast bindings are dispatched client-side, so adding one after
            // the channel has joined is safe. `postgres_changes` would not be —
            // those have to be bound before the join payload is sent.
            sub.channel.on("broadcast", { event }, (payload: any) => {
                const handlers = sub.handlers.get(event) ?? [];
                handlers.forEach((h) => {
                    try {
                        h(payload.payload);
                    } catch (err) {
                        console.error(`[Realtime] Handler error for ${event}:`, err);
                    }
                });
            });
        }

        sub.handlers.get(event)!.push(handler);

        // Join once per channel, never once per event. `RealtimeChannel.subscribe`
        // registers its status callbacks inside `if (state === closed)` and takes
        // no else branch, so a second call on a joined channel returns silently
        // and the callback is dropped.
        if (!sub.joined) {
            sub.joined = true;
            // Not awaited: `subscribe()` returns the channel, not a promise.
            sub.channel.subscribe((status: string) => {
                if (status === "SUBSCRIBED") this.liveChannels.add(channelName);
                else this.liveChannels.delete(channelName);
                this.syncConnected();
            });
        }

        let released = false;

        return async () => {
            if (released) return;
            released = true;

            const handlers = sub.handlers.get(event);
            if (!handlers) return;

            const idx = handlers.indexOf(handler);
            if (idx > -1) handlers.splice(idx, 1);
            if (handlers.length > 0) return;

            // Drop the event key as well as emptying its array. Testing
            // `handlers.size === 0` while the key was still present is why this
            // branch was unreachable and channels leaked for the life of the tab.
            sub.handlers.delete(event);
            if (sub.handlers.size > 0) return;

            this.subscriptions.delete(channelName);
            this.liveChannels.delete(channelName);
            this.syncConnected();

            // `removeChannel` unsubscribes *and* drops it from the client's list,
            // so a later `channel(topic)` builds a fresh one.
            await this.supabase.removeChannel(sub.channel);
        };
    }

    async broadcast(options: RealtimeOptions, data: any): Promise<void> {
        const { channel, event } = options;

        try {
            // Same topic as the subscription, so this reuses the joined channel
            // and pushes over the socket rather than falling back to REST.
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

    onConnectionChange(handler: (connected: boolean) => void): Unsubscribe {
        this.connectionHandlers.add(handler);
        handler(this.connected);

        return async () => {
            this.connectionHandlers.delete(handler);
        };
    }

    /**
     * Force an immediate connection attempt.
     *
     * Retrying is realtime-js's job, not this adapter's: `reconnectAfterMs` walks
     * `RECONNECT_INTERVALS` and then falls back to 10s, on the client's own timer
     * and with no attempt ceiling. The adapter used to run a second backoff loop
     * beside it that gave up permanently after five tries — so a signal drop of a
     * couple of minutes cost realtime for the rest of the session.
     *
     * Deliberately does not touch `connected`; that only ever moves on a channel
     * status callback.
     */
    async reconnect(): Promise<void> {
        this.supabase.realtime?.connect();
    }

    /**
     * Cleanup all subscriptions
     */
    async cleanup() {
        for (const subscription of this.subscriptions.values()) {
            await this.supabase.removeChannel(subscription.channel);
        }
        this.subscriptions.clear();
        this.liveChannels.clear();
        this.setConnected(false);
        this.connectionHandlers.clear();
    }
}
