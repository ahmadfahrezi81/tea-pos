"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `payouts-${params?.startDate ?? ""}-${params?.endDate ?? ""}-${params?.userId ?? "all"}`;
    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payrollApi.getPayouts(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}

export function usePayslip(payoutId: string | undefined, userId?: string) {
    const key = payoutId ? `payslip-${payoutId}-${userId ?? "none"}` : null;
    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payrollApi.getPayslip({ payoutId: payoutId!, ...(userId ? { userId } : {}) }),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { payslip: data ?? null, isLoading, error, mutate };
}
