import { apiFetch, buildParams } from "./client";
import type {
    ListPayrollCommissionsQuery,
    ListPayoutsQuery,
    GetPayslipQuery,
    UpdatePayoutInput,
    UpdatePayrollCommissionInput,
    ReviewPayrollDayInput,
} from "@tea-pos/features/payroll/schema";
import type { UpdatePayrollClaimStatusInput } from "@tea-pos/features/payroll-claims/schema";
import {
    PayrollCommissionListResponse,
    PayrollCommissionResponse,
    PayoutListResponse,
    PayslipResponse,
    ReviewPayrollDayResponse,
} from "@tea-pos/features/payroll/schema";

export const payrollApi = {
    /** Approve or reject every pending item a user has on one date. */
    reviewDay: async (input: ReviewPayrollDayInput) => {
        return ReviewPayrollDayResponse.parse(
            await apiFetch<unknown>("/api/payroll/reviews/day", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
    getCommissions: async (params?: Partial<ListPayrollCommissionsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollCommissionListResponse.parse(
            await apiFetch<unknown>(`/api/payroll/commissions?${sp}`),
        );
    },

    updateCommission: async (commissionId: string, input: UpdatePayrollCommissionInput) => {
        return PayrollCommissionResponse.parse(
            await apiFetch<unknown>(`/api/payroll/commissions/${encodeURIComponent(commissionId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    getPayouts: async (params?: Partial<ListPayoutsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayoutListResponse.parse(await apiFetch<unknown>(`/api/payroll/payouts?${sp}`));
    },

    getPayslip: async (params: GetPayslipQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return PayslipResponse.parse(await apiFetch<unknown>(`/api/payroll/payslip?${sp}`));
    },

    updateClaimStatus: async (claimId: string, input: UpdatePayrollClaimStatusInput) => {
        return apiFetch<unknown>(`/api/payroll/claims/${encodeURIComponent(claimId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },

    /** Returns the settled payslip, not the row — the shape the next screen renders. */
    updatePayout: async (payoutId: string, input: UpdatePayoutInput) => {
        return PayslipResponse.parse(
            await apiFetch<unknown>(`/api/payroll/payouts/${encodeURIComponent(payoutId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
