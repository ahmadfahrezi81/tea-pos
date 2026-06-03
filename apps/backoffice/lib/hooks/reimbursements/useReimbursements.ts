"use client";

import useSWR from "swr";
import { reimbursementsApi } from "@/lib/api/reimbursements";
import type { ListAllReimbursementsQuery, ReimbursementListResponse } from "@tea-pos/features/reimbursements/schema";

export function useReimbursements(params?: Partial<ListAllReimbursementsQuery>) {
    const key = `reimbursements-${params?.status ?? "all"}`;
    const { data, error, mutate, isLoading } = useSWR<ReimbursementListResponse>(
        key,
        () => reimbursementsApi.listAll(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { claims: data?.claims ?? [], isLoading, error, mutate };
}
