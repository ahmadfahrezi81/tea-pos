"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api/client";
import {
    PayrollCommissionConfigListResponse,
    PayrollCommissionConfigResponse,
    type CreatePayrollCommissionConfigInput,
    type UpdatePayrollCommissionConfigInput,
} from "@tea-pos/features/payroll-commission-configs/schema";

export function usePayrollCommissionConfigs() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-commission-configs",
        async () => {
            const raw = await apiFetch<unknown>("/api/payroll/commission-types");
            return PayrollCommissionConfigListResponse.parse(raw);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const create = async (input: CreatePayrollCommissionConfigInput) => {
        await apiFetch("/api/payroll/commission-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollCommissionConfigInput) => {
        const raw = await apiFetch<unknown>(`/api/payroll/commission-types/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const updated = PayrollCommissionConfigResponse.parse(raw);
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
