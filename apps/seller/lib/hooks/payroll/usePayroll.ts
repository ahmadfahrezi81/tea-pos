"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type {
    PayrollPeriodListResponse,
    PayrollCommissionListResponse,
    ListPayrollPeriodsQuery,
    ListPayrollCommissionsQuery,
} from "@tea-pos/features/payroll/schema";

export function useCurrentPayrollPeriod() {
    const { data, error, isLoading } = useSWR(
        "payroll-period-current",
        () => payrollApi.getCurrentPeriod(),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return {
        period: data?.period ?? null,
        isLoading,
        error,
    };
}

export function usePayrollPeriods(params?: Partial<ListPayrollPeriodsQuery>) {
    const { data, error, mutate, isLoading } = useSWR<PayrollPeriodListResponse>(
        "payroll-periods",
        () => payrollApi.getPeriods(params),
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    return {
        periods: data?.periods ?? [],
        isLoading,
        error,
        mutate,
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
        { revalidateOnFocus: false, dedupingInterval: 60000 },
    );

    const updateCommissionStatus = async (
        commissionId: string,
        status: "pending" | "approved" | "rejected",
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
