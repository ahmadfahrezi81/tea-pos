import { apiFetch, buildParams } from "./client";
import type {
    ListPayrollPeriodsQuery,
    ListPayrollEntriesQuery,
    ListPayoutsQuery,
    GetPayslipQuery,
    UpdatePayrollEntryInput,
    UpdatePayrollPeriodInput,
    UpdatePayoutInput,
} from "@tea-pos/features/payroll/schema";
import {
    PayrollPeriodListResponse,
    PayrollEntryListResponse,
    PayrollPeriodResponse,
    PayrollEntryResponse,
    PayoutListResponse,
} from "@tea-pos/features/payroll/schema";

export const payrollApi = {
    getPeriods: async (params?: Partial<ListPayrollPeriodsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollPeriodListResponse.parse(await apiFetch<unknown>(`/api/payroll/periods?${sp}`));
    },

    updatePeriod: async (periodId: string, input: UpdatePayrollPeriodInput) => {
        return PayrollPeriodResponse.parse(
            await apiFetch<unknown>(`/api/payroll/periods/${encodeURIComponent(periodId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    getEntries: async (params?: Partial<ListPayrollEntriesQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return PayrollEntryListResponse.parse(await apiFetch<unknown>(`/api/payroll/entries?${sp}`));
    },

    updateEntry: async (entryId: string, input: UpdatePayrollEntryInput) => {
        return PayrollEntryResponse.parse(
            await apiFetch<unknown>(`/api/payroll/entries/${encodeURIComponent(entryId)}`, {
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
