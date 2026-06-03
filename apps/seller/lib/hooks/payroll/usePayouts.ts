"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `payouts-${params?.periodId ?? "all"}-${params?.userId ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payrollApi.getPayouts(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}
