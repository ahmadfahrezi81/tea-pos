"use client";

import useSWR from "swr";
import { payoutsApi } from "@/lib/api/payouts";
import type { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `payouts-${params?.startDate ?? ""}-${params?.endDate ?? ""}-${params?.userId ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payoutsApi.getPayouts(params),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}
