"use client";

import { useEffect, useRef } from "react";
import { mutationQueue } from "./MutationQueue";
import { isOnline, waitForOnline } from "./withTimeout";

export interface MutationSyncHandler {
    type: string;
    handler: (payload: any) => Promise<void>;
}

/**
 * Hook to sync queued mutations when device comes online
 * Should be used in a provider or at app root
 */
export function useMutationSync(handlers: MutationSyncHandler[]) {
    const handlerMapRef = useRef<Record<string, (payload: any) => Promise<void>>>({});
    const syncInProgressRef = useRef(false);

    // Update handler map
    useEffect(() => {
        handlerMapRef.current = {};
        handlers.forEach((h) => {
            handlerMapRef.current[h.type] = h.handler;
        });
    }, [handlers]);

    // Sync on mount and when online
    useEffect(() => {
        let unsubscribeOnline: (() => void) | null = null;
        let syncTimeoutId: NodeJS.Timeout | null = null;

        const performSync = async () => {
            if (syncInProgressRef.current) return;
            if (!isOnline()) return;

            syncInProgressRef.current = true;

            try {
                const mutations = mutationQueue.getAll();
                if (mutations.length === 0) {
                    return;
                }

                console.log(`[MutationSync] Syncing ${mutations.length} mutations`);

                for (const mutation of mutations) {
                    const handler = handlerMapRef.current[mutation.type];
                    if (!handler) {
                        console.warn(`[MutationSync] No handler for type: ${mutation.type}`);
                        mutationQueue.remove(mutation.id);
                        continue;
                    }

                    try {
                        await handler(mutation.payload);
                        mutationQueue.remove(mutation.id);
                        console.log(`[MutationSync] Synced: ${mutation.type}`);
                    } catch (err) {
                        const status = (err as { status?: number })?.status;
                        const isTerminal = status === 404 || status === 409 || status === 403;
                        if (isTerminal) {
                            mutationQueue.remove(mutation.id);
                            console.warn(`[MutationSync] Terminal error for ${mutation.type} (${status}), dropping:`, err);
                        } else {
                            const canRetry = mutationQueue.incrementRetry(mutation.id);
                            if (!canRetry) {
                                mutationQueue.remove(mutation.id);
                                console.error(`[MutationSync] Max retries reached for ${mutation.type}, dropping:`, err);
                            } else {
                                console.warn(`[MutationSync] Failed to sync ${mutation.type}, will retry:`, err);
                            }
                        }
                    }
                }
            } finally {
                syncInProgressRef.current = false;
            }
        };

        const scheduleSync = () => {
            if (syncTimeoutId) clearTimeout(syncTimeoutId);
            // Only sync if online, otherwise wait for online
            if (isOnline()) {
                performSync();
                // Retry periodically every 10s in case handler still fails
                syncTimeoutId = setTimeout(() => scheduleSync(), 10000);
            }
        };

        // Listen to online event
        const handleOnline = () => {
            console.log("[MutationSync] Device came online, syncing mutations");
            scheduleSync();
        };

        window.addEventListener("online", handleOnline);

        // Initial sync if already online
        if (isOnline()) {
            scheduleSync();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            if (syncTimeoutId) clearTimeout(syncTimeoutId);
        };
    }, []);
}
