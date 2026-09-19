"use client";

import useSWR from "swr";
import { payrollClaimsApi } from "@/lib/api/payroll-claims";
import type {
    ListAllPayrollClaimsQuery,
    PayrollClaimListResponse,
    UpdatePayrollClaimStatusInput,
} from "@tea-pos/features/payroll-claims/schema";

export function usePayrollClaims(params?: Partial<ListAllPayrollClaimsQuery>) {
    const key = `payroll-claims-${params?.status ?? "all"}-${params?.startDate ?? "all"}-${params?.endDate ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayrollClaimListResponse>(
        key,
        () => payrollClaimsApi.list(params),
    );

    const updateStatus = async (id: string, input: UpdatePayrollClaimStatusInput) => {
        const result = await payrollClaimsApi.updateStatus(id, input);
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
