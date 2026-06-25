"use client";

import useSWR from "swr";
import { payrollApi } from "@/lib/api/payroll";
import type {
    PayrollCommissionListResponse,
    ListPayrollCommissionsQuery,
} from "@tea-pos/features/payroll/schema";

export function usePayrollCommissions(params?: Partial<ListPayrollCommissionsQuery>) {
    const key =
        params?.startDate || params?.userId
            ? `payroll-commissions-${params.startDate ?? ""}${params.endDate ?? ""}-${params.userId ?? "all"}`
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
