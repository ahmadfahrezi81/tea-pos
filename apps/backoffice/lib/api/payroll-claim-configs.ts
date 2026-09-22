import { apiFetch } from "./client";
import {
    PayrollClaimConfigListResponse,
    PayrollClaimConfigResponse,
    ClaimEligibilityListResponse,
    type CreatePayrollClaimConfigInput,
    type UpdatePayrollClaimConfigInput,
    type SetClaimEligibilityInput,
} from "@tea-pos/features/payroll-claim-configs/schema";

export const payrollClaimConfigsApi = {
    list: async () => {
        return PayrollClaimConfigListResponse.parse(
            await apiFetch<unknown>("/api/payroll/claim-types"),
        );
    },

    create: async (input: CreatePayrollClaimConfigInput) => {
        return apiFetch<unknown>("/api/payroll/claim-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },

    update: async (id: string, input: UpdatePayrollClaimConfigInput) => {
        return PayrollClaimConfigResponse.parse(
            await apiFetch<unknown>(`/api/payroll/claim-types/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    /** Replaces the full eligible set for one user — see `setUserClaimEligibility`. */
    setEligibility: async (input: SetClaimEligibilityInput) => {
        return apiFetch<unknown>("/api/payroll/claim-types/eligibility", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },

    /** Every staff member's eligibility in one call — see `listClaimEligibility`. */
    listEligibility: async () => {
        return ClaimEligibilityListResponse.parse(
            await apiFetch<unknown>("/api/payroll/claim-types/eligibility"),
        );
    },
};
