import { apiFetch, buildParams } from "./client";
import type { ListPayrollPeriodsQuery, ListPayrollEntriesQuery, UpdatePayrollEntryInput, UpdatePayrollPeriodInput } from "@tea-pos/features/payroll/schema";
import {
    PayrollPeriodListResponse,
    PayrollEntryListResponse,
    PayrollPeriodResponse,
    PayrollEntryResponse,
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
};
