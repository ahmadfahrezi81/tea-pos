"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";

export function usePayslip(payoutId: string | undefined) {
    const key = payoutId ? `payslip-${payoutId}` : null;

    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payrollApi.getPayslip({ payoutId: payoutId! }),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return { payslip: data ?? null, isLoading, error, mutate };
}
