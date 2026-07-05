import { apiFetch, buildParams } from "./client";
import type { ListPayoutsQuery, GetPayslipQuery } from "@tea-pos/features/payroll/schema";
import { PayoutListResponse } from "@tea-pos/features/payroll/schema";

export const payrollApi = {
    getPayouts: async (params?: Partial<ListPayoutsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayoutListResponse.parse(await apiFetch<unknown>(`/api/payroll/payouts?${sp}`));
    },

    getPayslip: async (params: GetPayslipQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return apiFetch<unknown>(`/api/payroll/payslip?${sp}`);
    },
};
