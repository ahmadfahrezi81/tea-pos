"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";

export function usePayslip(payoutId: string | undefined, userId?: string) {
    const key = payoutId ? `payslip-${payoutId}-${userId ?? "self"}` : null;

    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payrollApi.getPayslip({ payoutId: payoutId!, ...(userId ? { userId } : {}) }),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return { payslip: data ?? null, isLoading, error, mutate };
}
