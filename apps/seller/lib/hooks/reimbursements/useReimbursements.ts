"use client";

import useSWR from "swr";
import { useProfile } from "@/lib/hooks/profile/useProfile";
import { reimbursementsApi } from "@/lib/api/reimbursements";
import type { ReimbursementListResponse, CreateReimbursementInput } from "@tea-pos/features/reimbursements/schema";

export function useReimbursements() {
    const { profile } = useProfile();
    const userId = profile?.id;

    const key = userId ? `reimbursements-${userId}` : null;

    const { data, error, mutate, isLoading } = useSWR<ReimbursementListResponse>(
        key,
        () => reimbursementsApi.list(),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const create = async (input: CreateReimbursementInput) => {
        const claim = await reimbursementsApi.create(input);
        await mutate();
        return claim;
    };

    return {
        claims: data?.claims ?? [],
        isLoading,
        error,
        mutate,
        create,
    };
}
