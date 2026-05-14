"use client";

import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";
import type { OpenStoreInput, TransferSessionInput, StoreSessionResponse } from "@tea-pos/features/sessions/schema";

export function useSession(storeId?: string) {
    const key = storeId ? `session-${storeId}` : null;

    const { data, error, mutate, isLoading } = useSWR<StoreSessionResponse | null>(
        key,
        () => sessionsApi.getActive({ storeId: storeId! }),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const openStore = async (input: Omit<OpenStoreInput, "storeId">) => {
        const result = await sessionsApi.open({ storeId: storeId!, ...input });
        await mutate(result.session, false);
        return result;
    };

    const transferSession = async (claimCode: TransferSessionInput["claimCode"]) => {
        const result = await sessionsApi.transfer({ storeId: storeId!, claimCode });
        await mutate(result, false);
        return result;
    };

    const endSession = async (sessionId: string) => {
        const result = await sessionsApi.end(sessionId);
        await mutate(null, false);
        return result;
    };

    return {
        session: data ?? null,
        isLoading,
        error,
        mutate,
        openStore,
        transferSession,
        endSession,
    };
}
