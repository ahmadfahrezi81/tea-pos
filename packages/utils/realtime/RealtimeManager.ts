export interface RealtimeOptions {
    channel: string;
    event: string;
}

export type RealtimeHandler = (data: any) => void;
export type Unsubscribe = () => Promise<void>;

export interface RealtimeManager {
    /**
     * Subscribe to a channel event with automatic reconnection and fallback
     * @param options - Channel and event to subscribe to
     * @param handler - Callback when message received
     * @returns Unsubscribe function
     */
    subscribe(options: RealtimeOptions, handler: RealtimeHandler): Promise<Unsubscribe>;

    /**
     * Broadcast a message to a channel
     */
    broadcast(options: RealtimeOptions, data: any): Promise<void>;

    /**
     * Check if realtime connection is active
     */
    isConnected(): boolean;

    /**
     * Get connection status as observable
     */
    onConnectionChange(handler: (connected: boolean) => void): Unsubscribe;

    /**
     * Manually trigger reconnection
     */
    reconnect(): Promise<void>;
}

/**
 * Status of a subscription
 */
export interface SubscriptionStatus {
    connected: boolean;
    lastUpdate: number;
    messageCount: number;
    failureCount: number;
}
