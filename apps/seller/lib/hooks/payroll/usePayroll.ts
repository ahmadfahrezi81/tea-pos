"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type {
    PayrollPeriodListResponse,
    PayrollCommissionListResponse,
    ListPayrollPeriodsQuery,
    ListPayrollCommissionsQuery,
} from "@tea-pos/features/payroll/schema";

export function usePayrollPeriods(params?: Partial<ListPayrollPeriodsQuery>) {
    const key = `payroll-periods-${params?.status ?? "all"}`;

    const { data, error, mutate, isLoading } = useSWR<PayrollPeriodListResponse>(
        key,
        () => payrollApi.getPeriods(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const updatePeriodStatus = async (
        periodId: string,
        status: "pending" | "approved" | "on_hold" | "paid",
    ) => {
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

export function usePayrollCommissions(params?: Partial<ListPayrollCommissionsQuery>) {
    const key =
        params?.periodId || params?.userId
            ? `payroll-commissions-${params.periodId ?? "all"}-${params.userId ?? "all"}`
            : "payroll-commissions-all";

    const { data, error, mutate, isLoading } = useSWR<PayrollCommissionListResponse>(
        key,
        () => payrollApi.getCommissions(params),
        { revalidateOnFocus: false, dedupingInterval: 5000 },
    );

    const updateCommissionStatus = async (
        commissionId: string,
        status: "draft" | "approved" | "paid",
    ) => {
        const result = await payrollApi.updateCommission(commissionId, { status });
        await mutate();
        return result;
    };

    return {
        commissions: data?.commissions ?? [],
        isLoading,
        error,
        mutate,
        updateCommissionStatus,
    };
}
