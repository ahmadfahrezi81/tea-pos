"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type { ListPayrollPeriodsQuery, PayrollPeriodListResponse, ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";

export function usePayrollPeriods(params?: Partial<ListPayrollPeriodsQuery>) {
    const { data, error, mutate, isLoading } = useSWR<PayrollPeriodListResponse>(
        "payroll-periods",
        () => payrollApi.getPeriods(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { periods: data?.periods ?? [], isLoading, error, mutate };
}

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `payouts-${params?.periodId ?? "all"}-${params?.userId ?? "all"}`;
    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payrollApi.getPayouts(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}

export function usePayslip(periodId: string | undefined, userId?: string) {
    const key = periodId ? `payslip-${periodId}-${userId ?? "none"}` : null;
    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payrollApi.getPayslip({ periodId: periodId!, ...(userId ? { userId } : {}) }),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );
    return { payslip: data ?? null, isLoading, error, mutate };
}
