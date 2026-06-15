"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import { useRealtime } from "@/lib/context/RealtimeContext";
import { mutationQueue, withTimeout, isOnline, useMutationSync } from "@tea-pos/utils/offline";
import type { OpenStoreInput, TransferSessionInput, GateStateResponse } from "@tea-pos/features/sessions/schema";

export function useSession(storeId?: string) {
    const key = storeId ? `session-gate-${storeId}` : null;
    const { realtime, isConnected } = useRealtime();
    const [realtimeData, setRealtimeData] = useState<GateStateResponse | null>(null);

    // Fallback polling: only poll when realtime is down
    const { data: polledData, error, mutate, isLoading } = useSWR<GateStateResponse>(
        key,
        () => sessionsApi.getGateState({ storeId: storeId! }),
        {
            revalidateOnFocus: true,
            // Only poll if realtime is disconnected
            dedupingInterval: isConnected ? Infinity : 10000,
            refreshInterval: isConnected ? Infinity : 30000,
        },
    );

    // Subscribe to realtime updates
    useEffect(() => {
        if (!realtime || !storeId) return;

        let unsubscribe: (() => Promise<void>) | null = null;

        (async () => {
            try {
                unsubscribe = await realtime.subscribe(
                    { channel: `store:${storeId}`, event: "session:changed" },
                    (update: GateStateResponse) => {
                        setRealtimeData(update);
                        mutate(update, false);
                    }
                );
            } catch (err) {
                console.error("[useSession] Realtime subscription failed, falling back to polling:", err);
            }
        })();

        return () => {
            unsubscribe?.();
        };
    }, [realtime, storeId, mutate]);

    // Prefer realtime data, fall back to polled data
    const data = realtimeData ?? polledData;

    const broadcast = async (update: GateStateResponse) => {
        if (!realtime || !storeId) return;
        try {
            await realtime.broadcast(
                { channel: `store:${storeId}`, event: "session:changed" },
                update
            );
        } catch (err) {
            console.warn("[useSession] Broadcast failed (non-critical):", err);
        }
    };

    const openStore = async (input: Omit<OpenStoreInput, "storeId">) => {
        const result = await sessionsApi.open({ storeId: storeId!, ...input });
        const update = { gate: "open" as const, session: result.session };

        // 1. Instant UI update
        mutate(update, false);

        // 2. Queue for offline sync
        mutationQueue.add("openStore", input);

        // 3. Try to broadcast with timeout (5s)
        const broadcastResult = await withTimeout(
            broadcast(update),
            5000,
            "broadcast openStore"
        );

        // 4. Try to refetch with timeout (10s)
        const refetchResult = await withTimeout(
            mutate(),
            10000,
            "refetch after openStore"
        );

        if (!broadcastResult.success || !refetchResult.success) {
            console.warn("[useSession] openStore: slow network, relying on fallback", {
                broadcastOk: broadcastResult.success,
                refetchOk: refetchResult.success,
            });
        }

        return result;
    };

    const resumeSession = async () => {
        if (!data || data.gate !== "no_session") throw new Error("No open summary to resume");
        const result = await sessionsApi.resume({ storeId: storeId!, summaryId: data.summaryId });
        const update = { gate: "open" as const, session: result.session };

        // 1. Instant UI update
        mutate(update, false);

        // 2. Queue for offline sync
        mutationQueue.add("resumeSession", { summaryId: data.summaryId });

        // 3. Try to broadcast with timeout (5s)
        const broadcastResult = await withTimeout(
            broadcast(update),
            5000,
            "broadcast resumeSession"
        );

        // 4. Try to refetch with timeout (10s)
        const refetchResult = await withTimeout(
            mutate(),
            10000,
            "refetch after resumeSession"
        );

        if (!broadcastResult.success || !refetchResult.success) {
            console.warn("[useSession] resumeSession: slow network, relying on fallback", {
                broadcastOk: broadcastResult.success,
                refetchOk: refetchResult.success,
            });
        }

        return result;
    };

    const transferSession = async (claimCode: TransferSessionInput["claimCode"]) => {
        const result = await sessionsApi.transfer({ storeId: storeId!, claimCode });
        const update = { gate: "open" as const, session: result };

        // 1. Instant UI update
        mutate(update, false);

        // 2. Queue for offline sync
        mutationQueue.add("transferSession", { claimCode });

        // 3. Try to broadcast with timeout (5s)
        const broadcastResult = await withTimeout(
            broadcast(update),
            5000,
            "broadcast transferSession"
        );

        // 4. Try to refetch with timeout (10s)
        const refetchResult = await withTimeout(
            mutate(),
            10000,
            "refetch after transferSession"
        );

        if (!broadcastResult.success || !refetchResult.success) {
            console.warn("[useSession] transferSession: slow network, relying on fallback", {
                broadcastOk: broadcastResult.success,
                refetchOk: refetchResult.success,
            });
        }

        return result;
    };

    const endSession = async (sessionId: string) => {
        const result = await sessionsApi.end(sessionId);

        // 1. Queue for offline sync
        mutationQueue.add("endSession", { sessionId });

        // 2. Try to refetch with timeout (10s)
        const refetchResult = await withTimeout(
            mutate(),
            10000,
            "refetch after endSession"
        );

        // 3. Try to broadcast with timeout (5s)
        const broadcastResult = await withTimeout(
            broadcast({ gate: "closed" as const, summaryId: result.summaryId }),
            5000,
            "broadcast endSession"
        );

        if (!refetchResult.success || !broadcastResult.success) {
            console.warn("[useSession] endSession: slow network, relying on fallback", {
                refetchOk: refetchResult.success,
                broadcastOk: broadcastResult.success,
            });
        }

        return result;
    };

    // Setup offline sync for queued mutations
    useMutationSync([
        {
            type: "openStore",
            handler: async (payload: any) => {
                if (!storeId) throw new Error("Store ID required for openStore sync");
                await sessionsApi.open({ storeId, ...payload });
            },
        },
        {
            type: "resumeSession",
            handler: async (payload: any) => {
                if (!storeId) throw new Error("Store ID required for resumeSession sync");
                await sessionsApi.resume({ storeId, summaryId: payload.summaryId });
            },
        },
        {
            type: "transferSession",
            handler: async (payload: any) => {
                if (!storeId) throw new Error("Store ID required for transferSession sync");
                await sessionsApi.transfer({ storeId, claimCode: payload.claimCode });
            },
        },
        {
            type: "endSession",
            handler: async (payload: any) => {
                await sessionsApi.end(payload.sessionId);
            },
        },
    ]);

    return {
        gate: data?.gate ?? null,
        session: data?.gate === "open" ? data.session : null,
        summaryId:
            data?.gate === "open" ? data.session.dailySummaryId
            : data?.gate === "no_session" ? data.summaryId
            : data?.gate === "closed" ? data.summaryId
            : null,
        isLoading,
        error,
        mutate,
        openStore,
        resumeSession,
        transferSession,
        endSession,
    };
}
