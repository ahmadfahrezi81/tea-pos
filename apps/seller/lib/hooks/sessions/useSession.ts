"use client";

import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { OpenStoreInput, TransferSessionInput, GateStateResponse } from "@tea-pos/features/sessions/schema";

export function useSession(storeId?: string) {
    const key = storeId ? `session-gate-${storeId}` : null;

    const { data, error, mutate, isLoading } = useSWR<GateStateResponse>(
        key,
        () => sessionsApi.getGateState({ storeId: storeId! }),
        { revalidateOnFocus: false, dedupingInterval: 5000, refreshInterval: 20000 },
    );

    const openStore = async (input: Omit<OpenStoreInput, "storeId">) => {
        const result = await sessionsApi.open({ storeId: storeId!, ...input });
        await mutate({ gate: "open", session: result.session }, false);
        return result;
    };

    const resumeSession = async () => {
        if (!data || data.gate !== "no_session") throw new Error("No open summary to resume");
        const result = await sessionsApi.resume({ storeId: storeId!, summaryId: data.summaryId });
        await mutate({ gate: "open", session: result.session }, false);
        return result;
    };

    const transferSession = async (claimCode: TransferSessionInput["claimCode"]) => {
        const result = await sessionsApi.transfer({ storeId: storeId!, claimCode });
        await mutate({ gate: "open", session: result }, false);
        return result;
    };

    const endSession = async (sessionId: string) => {
        const result = await sessionsApi.end(sessionId);
        await mutate();
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
