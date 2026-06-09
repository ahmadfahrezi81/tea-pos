"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api/client";
import {
    PayrollCommissionTypeListResponse,
    PayrollCommissionTypeResponse,
    type CreatePayrollCommissionTypeInput,
    type UpdatePayrollCommissionTypeInput,
} from "@tea-pos/features/payroll-commission-types/schema";

export function usePayrollCommissionTypes() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-commission-types",
        async () => {
            const raw = await apiFetch<unknown>("/api/payroll/commission-types");
            return PayrollCommissionTypeListResponse.parse(raw);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const create = async (input: CreatePayrollCommissionTypeInput) => {
        await apiFetch("/api/payroll/commission-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollCommissionTypeInput) => {
        const raw = await apiFetch<unknown>(`/api/payroll/commission-types/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const updated = PayrollCommissionTypeResponse.parse(raw);
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
