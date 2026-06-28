"use client";

import useSWR from "swr";
import { apiFetch, buildParams } from "@/lib/api/client";
import type {
    ListAllPayrollClaimsQuery,
    PayrollClaimListResponse,
    UpdatePayrollClaimStatusInput,
} from "@tea-pos/features/payroll-claims/schema";
import {
    PayrollClaimListResponse as PayrollClaimListResponseSchema,
    PayrollClaimResponse,
} from "@tea-pos/features/payroll-claims/schema";

export function usePayrollClaims(params?: Partial<ListAllPayrollClaimsQuery>) {
    const key = `payroll-claims-${params?.status ?? "all"}-${params?.startDate ?? "all"}-${params?.endDate ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayrollClaimListResponse>(
        key,
        async () => {
            const sp = buildParams((params ?? {}) as Record<string, unknown>);
            const raw = await apiFetch<unknown>(`/api/payroll/claims?${sp}`);
            return PayrollClaimListResponseSchema.parse(raw);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const updateStatus = async (id: string, input: UpdatePayrollClaimStatusInput) => {
        const raw = await apiFetch<unknown>(`/api/payroll/claims/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const result = PayrollClaimResponse.parse(raw);
        await mutate();
        return result;
    };

    return {
        claims: data?.claims ?? [],
        isLoading,
        error,
        mutate,
        updateStatus,
    };
}
