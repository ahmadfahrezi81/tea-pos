"use client";

import useSWR from "swr";
import { payrollClaimConfigsApi } from "@/lib/api/payroll-claim-configs";
import type {
    CreatePayrollClaimConfigInput,
    UpdatePayrollClaimConfigInput,
    SetClaimEligibilityInput,
} from "@tea-pos/features/payroll-claim-configs/schema";

export function usePayrollClaimConfigs() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-claim-configs",
        () => payrollClaimConfigsApi.list(),
    );

    const create = async (input: CreatePayrollClaimConfigInput) => {
        await payrollClaimConfigsApi.create(input);
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollClaimConfigInput) => {
        const updated = await payrollClaimConfigsApi.update(id, input);
        await mutate();
        return updated;
    };

    const setEligibility = async (input: SetClaimEligibilityInput) => {
        await payrollClaimConfigsApi.setEligibility(input);
    };

    return {
        claimTypes: data?.claimTypes ?? [],
        isLoading,
        error,
        mutate,
        create,
        update,
        setEligibility,
    };
}

export function useUserClaimEligibility(userId: string | undefined) {
    const { data, error, mutate, isLoading } = useSWR(
        userId ? `user-claim-eligibility-${userId}` : null,
        async () => (await payrollClaimConfigsApi.getEligibility(userId!)).eligibility,
    );

    return {
        eligibility: data ?? [],
        activeTypeIds: (data ?? []).map((e) => e.claimConfigId),
        isLoading,
        error,
        mutate,
    };
}
