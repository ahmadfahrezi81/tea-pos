"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";

export function usePayslip(periodId: string | undefined, userId?: string) {
    const key = periodId ? `payslip-${periodId}-${userId ?? "self"}` : null;

    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payrollApi.getPayslip({ periodId: periodId!, ...(userId ? { userId } : {}) }),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return { payslip: data ?? null, isLoading, error, mutate };
}
