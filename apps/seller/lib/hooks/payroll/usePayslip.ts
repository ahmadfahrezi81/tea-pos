"use client";

import useSWR from "swr";
import { payoutsApi } from "@/lib/api/payouts";

export function usePayslip(payoutId: string | undefined) {
    const key = payoutId ? `payslip-${payoutId}` : null;

    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payoutsApi.getPayslip({ payoutId: payoutId! }),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return { payslip: data ?? null, isLoading, error, mutate };
}
