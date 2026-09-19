"use client";

import useSWR from "swr";
import { payrollUserInfoApi } from "@/lib/api/payroll-user-info";
import type {
    AdminUpdatePayrollUserInfoInput,
    PayrollUserInfoResponse,
} from "@tea-pos/features/payroll-user-info/schema";
import { SWR } from "@tea-pos/utils/swr";

export function usePayrollUserInfo(userId: string | undefined) {
    const { data, error, mutate, isLoading } = useSWR<PayrollUserInfoResponse>(
        userId ? `payroll-user-info-${userId}` : null,
        () => payrollUserInfoApi.get(userId!),
    );

    const update = async (input: AdminUpdatePayrollUserInfoInput) => {
        if (!userId) return;
        const updated = await payrollUserInfoApi.update(userId, input);
        // The response is the new row, so it is written straight into the cache
        // rather than refetched.
        await mutate(updated, false);
        return updated;
    };

    return { info: data ?? null, isLoading, error, mutate, update };
}

export function useAllPayrollUserInfos() {
    const { data, error, isLoading } = useSWR(
        "payroll-user-infos-all",
        () => payrollUserInfoApi.listAll(),
        { dedupingInterval: SWR.QUICK },
    );
    return { infos: data?.infos ?? [], isLoading, error };
}
