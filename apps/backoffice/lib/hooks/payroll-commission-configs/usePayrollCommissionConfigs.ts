"use client";

import useSWR from "swr";
import { payrollCommissionConfigsApi } from "@/lib/api/payroll-commission-configs";
import type {
    CreatePayrollCommissionConfigInput,
    UpdatePayrollCommissionConfigInput,
} from "@tea-pos/features/payroll-commission-configs/schema";
import { SWR } from "@tea-pos/utils/swr";

/** `STATIC`, for the reason written on `usePayrollClaimConfigs`. */
export function usePayrollCommissionConfigs() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-commission-configs",
        () => payrollCommissionConfigsApi.list(),
        { dedupingInterval: SWR.STATIC },
    );

    const create = async (input: CreatePayrollCommissionConfigInput) => {
        await payrollCommissionConfigsApi.create(input);
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollCommissionConfigInput) => {
        const updated = await payrollCommissionConfigsApi.update(id, input);
        await mutate();
        return updated;
    };

    return {
        commissionTypes: data?.commissionTypes ?? [],
        isLoading,
        error,
        mutate,
        create,
        update,
    };
}
