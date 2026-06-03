import { apiFetch, buildParams } from "./client";
import type {
    ListPayrollPeriodsQuery,
    ListPayoutsQuery,
    GetPayslipQuery,
    UpdatePayoutInput,
} from "@tea-pos/features/payroll/schema";
import { PayrollPeriodListResponse, PayoutListResponse } from "@tea-pos/features/payroll/schema";

export const payrollApi = {
    getPeriods: async (params?: Partial<ListPayrollPeriodsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollPeriodListResponse.parse(await apiFetch<unknown>(`/api/payroll/periods?${sp}`));
    },

    getPayouts: async (params?: Partial<ListPayoutsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayoutListResponse.parse(await apiFetch<unknown>(`/api/payroll/payouts?${sp}`));
    },

    getPayslip: async (params: GetPayslipQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return apiFetch<unknown>(`/api/payroll/payslip?${sp}`);
    },

    upsertPayout: async (input: { periodId: string; userId: string }) => {
        return apiFetch<unknown>("/api/payroll/payouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },

    updatePayout: async (payoutId: string, input: UpdatePayoutInput) => {
        return apiFetch<unknown>(`/api/payroll/payouts/${encodeURIComponent(payoutId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },
};
