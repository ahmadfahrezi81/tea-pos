"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { reimbursementsApi } from "@/lib/api/reimbursements";
import type { ReimbursementListResponse, CreateReimbursementInput } from "@tea-pos/features/reimbursements/schema";

interface UseReimbursementsOptions {
    all?: boolean;
}

export function useReimbursements(options?: UseReimbursementsOptions) {
    const { user } = useAuth();
    const userId = user?.id;
    const isAll = options?.all === true;

    const key = isAll ? "reimbursements-all" : userId ? `reimbursements-${userId}` : null;

    const { data, error, mutate, isLoading } = useSWR<ReimbursementListResponse>(
        key,
        () => isAll ? reimbursementsApi.listAll() : reimbursementsApi.list(),
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
