"use client";

import useSWR from "swr";
import { payoutsApi } from "@/lib/api/payouts";
import { SWR } from "@tea-pos/utils/swr";

export function usePayslip(payoutId: string | undefined) {
    const key = payoutId ? `payslip-${payoutId}` : null;

    const { data, error, mutate, isLoading } = useSWR(
        key,
        () => payoutsApi.getPayslip({ payoutId: payoutId! }),
        { dedupingInterval: SWR.COOL },
    );

    return { payslip: data ?? null, isLoading, error, mutate };
}
