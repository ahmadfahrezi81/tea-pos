"use client";

import useSWR from "swr";
import { apiFetch, buildParams } from "@/lib/api/client";
import type { AdminUpdatePayrollUserInfoInput, PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";
import { PayrollUserInfoResponse as PayrollUserInfoResponseSchema } from "@tea-pos/features/payroll-user-info/schema";

export function usePayrollUserInfo(userId: string | undefined) {
    const { data, error, mutate, isLoading } = useSWR<PayrollUserInfoResponse>(
        userId ? `payroll-user-info-${userId}` : null,
        async () => {
            const sp = buildParams({ userId } as Record<string, unknown>);
            const raw = await apiFetch<unknown>(`/api/payroll-user-info?${sp}`);
            return PayrollUserInfoResponseSchema.parse(raw);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const update = async (input: AdminUpdatePayrollUserInfoInput) => {
        if (!userId) return;
        const sp = buildParams({ userId } as Record<string, unknown>);
        const raw = await apiFetch<unknown>(`/api/payroll-user-info?${sp}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const updated = PayrollUserInfoResponseSchema.parse(raw);
        await mutate(updated, false);
        return updated;
    };

    return { info: data ?? null, isLoading, error, mutate, update };
}
