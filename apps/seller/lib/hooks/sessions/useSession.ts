"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import { useRealtime } from "@/lib/context/RealtimeContext";
import type { OpenStoreInput, TransferSessionInput, GateStateResponse } from "@tea-pos/features/sessions/schema";

export function useSession(storeId?: string) {
    const key = storeId ? `session-gate-${storeId}` : null;
    const { realtime, isConnected } = useRealtime();

    /*
     * Fallback polling: only poll when realtime is down.
     *
     * That comment used to be aspirational. `isConnected` was hardwired false by
     * a bug in the adapter, so this hook always took the polling branch — and
     * `Infinity` is not SWR's off switch anyway. SWR reschedules on a truthy
     * interval and the browser clamps a non-finite delay to 0, so the "healthy"
     * branch was a 0ms refetch loop waiting for the day the connection signal
     * started working. `0` is the off switch. See task 062.
     *
     * `revalidateOnFocus` stays on, against the app-wide default. The outgoing
     * device learns it lost the session only from the handover broadcast, and a
     * phone that was asleep misses it; nothing on the server rejects an order
     * from a seller whose session has moved on, and payroll attributes orders
     * inside session windows, so a stale gate means cups that pay nobody.
     * Refetching on focus is what covers that.
     */
    const { data, error, mutate, isLoading } = useSWR<GateStateResponse>(
        key,
        () => sessionsApi.getGateState({ storeId: storeId! }),
        {
            revalidateOnFocus: true,
            refreshInterval: isConnected ? 0 : 30000,
        },
    );

    // Subscribe to realtime updates
    useEffect(() => {
        if (!realtime || !storeId) return;

        // `subscribe` is async, so cleanup can run before it resolves. Without
        // this flag the unsubscribe handle lands after the effect is gone and
        // the subscription is orphaned.
        let cancelled = false;
        let unsubscribe: (() => Promise<void>) | null = null;

        (async () => {
            try {
                const release = await realtime.subscribe(
                    { channel: `store:${storeId}`, event: "session:changed" },
                    (update: GateStateResponse) => {
                        mutate(update, false);
                    }
                );
                if (cancelled) {
                    void release();
                    return;
                }
                unsubscribe = release;
            } catch (err) {
                console.error("[useSession] Realtime subscription failed, falling back to polling:", err);
            }
        })();

        return () => {
            cancelled = true;
            void unsubscribe?.();
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
