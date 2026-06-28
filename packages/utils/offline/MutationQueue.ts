/**
 * Simple offline-first mutation queue
 * Stores mutations while offline, syncs when online
 */

export interface QueuedMutation {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    retries: number;
}

const STORAGE_KEY = "__mutation_queue";
const MAX_RETRIES = 3;

export class MutationQueue {
    private queue: QueuedMutation[] = [];

    constructor() {
        this.load();
    }

    /**
     * Add mutation to queue
     */
    add(type: string, payload: any): string {
        const id = `${type}-${Date.now()}-${Math.random()}`;
        const mutation: QueuedMutation = {
            id,
            type,
            payload,
            timestamp: Date.now(),
            retries: 0,
        };

        this.queue.push(mutation);
        this.save();

        console.log(`[MutationQueue] Added: ${type}`, { id, payloadKeys: Object.keys(payload) });
        return id;
    }

    /**
     * Get all pending mutations
     */
    getAll(): QueuedMutation[] {
        return this.queue;
    }

    /**
     * Mark mutation as synced
     */
    remove(id: string): void {
        this.queue = this.queue.filter((m) => m.id !== id);
        this.save();
        console.log(`[MutationQueue] Removed: ${id}`);
    }

    /**
     * Increment retry count
     */
    incrementRetry(id: string): boolean {
        const mutation = this.queue.find((m) => m.id === id);
        if (!mutation) return false;

        mutation.retries++;
        this.save();

        if (mutation.retries >= MAX_RETRIES) {
            console.warn(`[MutationQueue] Max retries reached: ${id}`);
            return false;
        }

        return true;
    }

    /**
     * Clear queue (use with caution)
     */
    clear(): void {
        this.queue = [];
        this.save();
        console.log("[MutationQueue] Cleared");
    }

    /**
     * Persist to localStorage
     */
    private save(): void {
        try {
            if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
            }
        } catch (err) {
            console.error("[MutationQueue] Save failed:", err);
        }
    }

    /**
     * Restore from localStorage
     */
    private load(): void {
        try {
            if (typeof window !== "undefined") {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    this.queue = JSON.parse(stored);
                    console.log(`[MutationQueue] Loaded ${this.queue.length} mutations`);
                }
            }
        } catch (err) {
            console.error("[MutationQueue] Load failed:", err);
            this.queue = [];
        }
    }
}

// Singleton instance
export const mutationQueue = new MutationQueue();
