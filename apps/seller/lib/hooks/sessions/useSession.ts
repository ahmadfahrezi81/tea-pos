"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import { useRealtime } from "@/lib/context/RealtimeContext";
import type { OpenStoreInput, TransferSessionInput, GateStateResponse } from "@tea-pos/features/sessions/schema";

export function useSession(storeId?: string) {
    const key = storeId ? `session-gate-${storeId}` : null;
    const { realtime, isConnected } = useRealtime();

    // Fallback polling: only poll when realtime is down
    const { data, error, mutate, isLoading } = useSWR<GateStateResponse>(
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

    /**
     * Tell the other devices, then reconcile our own cache — both in the
     * background.
     *
     * The mutation has already landed on the server and the caller has already
     * applied it optimistically, so neither of these needs to hold the caller's
     * spinner open on a slow network. `mutate()` rejects when the revalidating
     * fetch fails; swallow that, because a failed *refetch* must not surface as
     * a failed *mutation* to the component that awaited it.
     */
    const syncAfterMutation = (update: GateStateResponse) => {
        void broadcast(update);
        void mutate().catch(() => {});
    };

    const openStore = async (input: Omit<OpenStoreInput, "storeId">) => {
        const result = await sessionsApi.open({ storeId: storeId!, ...input });
        const update = { gate: "open" as const, session: result.session };

        mutate(update, false);
        syncAfterMutation(update);

        return result;
    };

    const resumeSession = async () => {
        if (!data || data.gate !== "no_session") throw new Error("No open summary to resume");
        const result = await sessionsApi.resume({ storeId: storeId!, summaryId: data.summaryId });
        const update = { gate: "open" as const, session: result.session };

        mutate(update, false);
        syncAfterMutation(update);

        return result;
    };

    const transferSession = async (claimCode: TransferSessionInput["claimCode"]) => {
        const result = await sessionsApi.transfer({ storeId: storeId!, claimCode });
        const update = { gate: "open" as const, session: result };

        mutate(update, false);
        syncAfterMutation(update);

        return result;
    };

    const endSession = async (sessionId: string) => {
        const result = await sessionsApi.end(sessionId);

        syncAfterMutation({
            gate: "closed" as const,
            summaryId: result.dailySummaryId,
            closedAt: result.endedAt ?? new Date().toISOString(),
        });

        return result;
    };

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
