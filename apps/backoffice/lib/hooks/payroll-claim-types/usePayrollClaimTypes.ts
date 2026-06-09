"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api/client";
import {
    PayrollClaimTypeListResponse,
    PayrollClaimTypeResponse,
    type CreatePayrollClaimTypeInput,
    type UpdatePayrollClaimTypeInput,
    type SetClaimEligibilityInput,
} from "@tea-pos/features/payroll-claim-types/schema";

export function usePayrollClaimTypes() {
    const { data, error, mutate, isLoading } = useSWR(
        "payroll-claim-types",
        async () => {
            const raw = await apiFetch<unknown>("/api/payroll/claim-types");
            return PayrollClaimTypeListResponse.parse(raw);
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const create = async (input: CreatePayrollClaimTypeInput) => {
        await apiFetch("/api/payroll/claim-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        await mutate();
    };

    const update = async (id: string, input: UpdatePayrollClaimTypeInput) => {
        const raw = await apiFetch<unknown>(`/api/payroll/claim-types/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
        const updated = PayrollClaimTypeResponse.parse(raw);
        await mutate();
        return updated;
    };

    const setEligibility = async (input: SetClaimEligibilityInput) => {
        await apiFetch("/api/payroll/claim-types/eligibility", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
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
        async () => {
            const raw = await apiFetch<{ eligibility: Array<{ claimTypeId: string; removedAt: string | null }> }>(
                `/api/payroll/claim-types/eligibility?userId=${encodeURIComponent(userId!)}`,
            );
            return raw.eligibility;
        },
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    return {
        eligibility: data ?? [],
        activeTypeIds: (data ?? []).filter((e) => !e.removedAt).map((e) => e.claimTypeId),
        isLoading,
        error,
        mutate,
    };
}
