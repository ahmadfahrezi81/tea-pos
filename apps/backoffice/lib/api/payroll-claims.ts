import { apiFetch, buildParams } from "./client";
import type {
    ListAllPayrollClaimsQuery,
    UpdatePayrollClaimStatusInput,
} from "@tea-pos/features/payroll-claims/schema";
import {
    PayrollClaimListResponse,
    PayrollClaimResponse,
} from "@tea-pos/features/payroll-claims/schema";

export const payrollClaimsApi = {
    list: async (params?: Partial<ListAllPayrollClaimsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollClaimListResponse.parse(
            await apiFetch<unknown>(`/api/payroll/claims?${sp}`),
        );
    },

    updateStatus: async (id: string, input: UpdatePayrollClaimStatusInput) => {
        return PayrollClaimResponse.parse(
            await apiFetch<unknown>(`/api/payroll/claims/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
