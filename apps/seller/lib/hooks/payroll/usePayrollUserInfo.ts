"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/context/AuthContext";
import { payrollUserInfoApi } from "@/lib/api/payroll-user-info";
import type { PayrollUserInfoResponse, UpdatePayrollUserInfoInput } from "@tea-pos/features/payroll-user-info/schema";
import { SWR } from "@tea-pos/utils/swr";

export function usePayrollUserInfo() {
    const { user } = useAuth();
    const userId = user?.id;

    const { data, error, mutate, isLoading } = useSWR<PayrollUserInfoResponse | null>(
        userId ? `payroll-user-info-${userId}` : null,
        () => payrollUserInfoApi.get(),
        { dedupingInterval: SWR.COOL },
    );

    const update = async (input: UpdatePayrollUserInfoInput) => {
        const info = await payrollUserInfoApi.update(input);
        await mutate();
        return info;
    };

    return {
        info: data ?? null,
        isLoading,
        error,
        mutate,
        update,
    };
}
