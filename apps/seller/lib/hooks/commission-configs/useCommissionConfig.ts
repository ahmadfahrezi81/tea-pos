"use client";

import useSWR from "swr";
import { commissionConfigsApi } from "@/lib/api/commission-configs";
import type { CommissionRateResponse } from "@tea-pos/features/commission-configs/schema";

type CommissionRole = "USER" | "DRIVER" | "SUPPLIER";

export function useCommissionConfig(role: CommissionRole) {
    const { data, error, isLoading } = useSWR<CommissionRateResponse>(
        `commission-config-${role}`,
        () => commissionConfigsApi.getRate({ role }),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    return {
        ratePerCup: data?.rate ?? 0,
        effectiveDate: data?.effectiveDate ?? null,
        isLoading,
        error,
    };
}
