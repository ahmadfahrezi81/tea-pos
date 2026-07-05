import { apiFetch, buildParams } from "./client";
import type {
    CreatePayrollClaimInput,
    ListPayrollClaimsQuery,
    GetClaimableTypesQuery,
    GetClaimableDatesQuery,
} from "@tea-pos/features/payroll-claims/schema";
import {
    PayrollClaimListResponse,
    PayrollClaimResponse,
    ClaimableTypesResponse,
    ClaimableDatesResponse,
} from "@tea-pos/features/payroll-claims/schema";

export const payrollClaimsApi = {
    list: async (params?: Partial<ListPayrollClaimsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollClaimListResponse.parse(await apiFetch<unknown>(`/api/payroll/claims?${sp}`));
    },

    create: async (input: CreatePayrollClaimInput) => {
        return PayrollClaimResponse.parse(
            await apiFetch<unknown>("/api/payroll/claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    getClaimableTypes: async (params: GetClaimableTypesQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ClaimableTypesResponse.parse(
            await apiFetch<unknown>(`/api/payroll/claim-types?${sp}`),
        );
    },

    getClaimableDates: async (params: GetClaimableDatesQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ClaimableDatesResponse.parse(
            await apiFetch<unknown>(`/api/payroll/claimable-dates?${sp}`),
        );
    },
};
