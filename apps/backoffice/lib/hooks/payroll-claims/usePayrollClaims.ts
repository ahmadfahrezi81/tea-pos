"use client";

import useSWR, { useSWRConfig } from "swr";
import { payrollClaimsApi } from "@/lib/api/payroll-claims";
import type {
    ListAllPayrollClaimsQuery,
    PayrollClaimListResponse,
    UpdatePayrollClaimStatusInput,
} from "@tea-pos/features/payroll-claims/schema";
import { SWR } from "@tea-pos/utils/swr";

/** `COOL` — an admin review queue, filled by staff at shop pace, not by the till. */
export function usePayrollClaims(params?: Partial<ListAllPayrollClaimsQuery>) {
    const key = `payroll-claims-${params?.status ?? "all"}-${params?.startDate ?? "all"}-${params?.endDate ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayrollClaimListResponse>(
        key,
        () => payrollClaimsApi.list(params),
        { dedupingInterval: SWR.COOL },
    );

    /* Approving moves the payout totals and the payslip too — keys this hook
       does not own. The list is awaited because the screen stays on it. */
    const { mutate: globalMutate } = useSWRConfig();
    const updateStatus = async (id: string, input: UpdatePayrollClaimStatusInput) => {
        const result = await payrollClaimsApi.updateStatus(id, input);
        await mutate();
        void globalMutate(
            (key) => typeof key === "string" && (key.startsWith("payouts-") || key.startsWith("payslip-")),
        ).catch(() => {});
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
