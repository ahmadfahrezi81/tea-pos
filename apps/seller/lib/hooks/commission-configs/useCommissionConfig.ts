"use client";

import useSWR from "swr";
import { commissionConfigsApi } from "@/lib/api/commission-configs";
import type { CommissionRateResponse } from "@tea-pos/features/commission-configs/schema";

export function useCommissionConfig(userId: string | undefined) {
    const { data, error, isLoading } = useSWR<CommissionRateResponse>(
        userId ? `commission-config-${userId}` : null,
        () => commissionConfigsApi.getRate({ userId: userId! }),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    return {
        ratePerCup: data?.rate ?? 0,
        effectiveDate: data?.effectiveDate ?? null,
        isLoading,
        error,
    };
}
