import { apiFetch } from "./client";
import type { UpdatePayrollUserInfoInput } from "@tea-pos/features/payroll-user-info/schema";
import { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

export const payrollUserInfoApi = {
    get: async () => {
        return PayrollUserInfoResponse.parse(await apiFetch<unknown>("/api/payroll-user-info"));
    },

    update: async (input: UpdatePayrollUserInfoInput) => {
        return PayrollUserInfoResponse.parse(
            await apiFetch<unknown>("/api/payroll-user-info", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
