"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { reimbursementsApi } from "@/lib/api/reimbursements";
import type { ReimbursementListResponse, CreateReimbursementInput } from "@tea-pos/features/reimbursements/schema";

export function useReimbursements() {
    const { user } = useAuth();
    const userId = user?.id;

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
