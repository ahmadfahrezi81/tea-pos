"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type {
    PayrollPeriodListResponse,
    PayrollEntryListResponse,
    ListPayrollPeriodsQuery,
    ListPayrollEntriesQuery,
} from "@tea-pos/features/payroll/schema";

export function usePayrollPeriods(params?: Partial<ListPayrollPeriodsQuery>) {
    const key = `payroll-periods-${params?.status ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayrollPeriodListResponse>(
        key,
        () => payrollApi.getPeriods(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const updatePeriodStatus = async (periodId: string, status: "open" | "processing" | "paid") => {
        const result = await payrollApi.updatePeriod(periodId, { status });
        await mutate();
        return result;
    };

    return {
        periods: data?.periods ?? [],
        isLoading,
        error,
        mutate,
        updatePeriodStatus,
    };
}

export function usePayrollEntries(params?: Partial<ListPayrollEntriesQuery>) {
    const key = params?.periodId || params?.userId
        ? `payroll-entries-${params.periodId ?? "all"}-${params.userId ?? "all"}`
        : "payroll-entries-all";

    const { data, error, mutate, isLoading } = useSWR<PayrollEntryListResponse>(
        key,
        () => payrollApi.getEntries(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const updateEntryStatus = async (entryId: string, status: "draft" | "approved" | "paid") => {
        const result = await payrollApi.updateEntry(entryId, { status });
        await mutate();
        return result;
    };

    return {
        entries: data?.entries ?? [],
        isLoading,
        error,
        mutate,
        updateEntryStatus,
    };
}
