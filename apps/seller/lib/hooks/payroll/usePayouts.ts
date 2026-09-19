"use client";

import useSWR from "swr";
import { payoutsApi } from "@/lib/api/payouts";
import type { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";
import { SWR } from "@tea-pos/utils/swr";

export function usePayouts(params?: Partial<ListPayoutsQuery>) {
    const key = `payouts-${params?.startDate ?? ""}-${params?.endDate ?? ""}-${params?.userId ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayoutListResponse>(
        key,
        () => payoutsApi.getPayouts(params),
        { dedupingInterval: SWR.COOL },
    );

    return { payouts: data?.payouts ?? [], isLoading, error, mutate };
}
