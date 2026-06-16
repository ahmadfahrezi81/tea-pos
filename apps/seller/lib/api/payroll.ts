import { apiFetch, buildParams } from "./client";
import type {
    ListPayrollPeriodsQuery,
    ListPayrollCommissionsQuery,
    ListPayoutsQuery,
    GetPayslipQuery,
    UpdatePayrollCommissionInput,
    UpdatePayoutInput,
} from "@tea-pos/features/payroll/schema";
import {
    PayrollPeriodListResponse,
    PayrollCommissionListResponse,
    PayrollPeriodResponse,
    PayrollCommissionResponse,
    PayoutListResponse,
} from "@tea-pos/features/payroll/schema";
import { z } from "zod";

const CurrentPeriodResponse = z.object({ period: PayrollPeriodResponse });

export const payrollApi = {
    getCurrentPeriod: async () => {
        const data = await apiFetch<unknown>("/api/payroll/periods/current");
        return CurrentPeriodResponse.parse(data);
    },

    getPeriods: async (params?: Partial<ListPayrollPeriodsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollPeriodListResponse.parse(await apiFetch<unknown>(`/api/payroll/periods?${sp}`));
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
