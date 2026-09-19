import { apiFetch, buildParams } from "./client";
import type {
    AdminUpdatePayrollUserInfoInput,
    PayrollUserInfoResponse as PayrollUserInfo,
} from "@tea-pos/features/payroll-user-info/schema";
import { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

export const payrollUserInfoApi = {
    get: async (userId: string) => {
        const sp = buildParams({ userId } as Record<string, unknown>);
        return PayrollUserInfoResponse.parse(
            await apiFetch<unknown>(`/api/payroll-user-info?${sp}`),
        );
    },

    update: async (userId: string, input: AdminUpdatePayrollUserInfoInput) => {
        const sp = buildParams({ userId } as Record<string, unknown>);
        return PayrollUserInfoResponse.parse(
            await apiFetch<unknown>(`/api/payroll-user-info?${sp}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },

    listAll: async () => {
        return apiFetch<{ infos: PayrollUserInfo[] }>("/api/payroll-user-info");
    },
};
