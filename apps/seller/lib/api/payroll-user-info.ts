import { apiFetch } from "./client";
import type { UpdatePayrollUserInfoInput } from "@tea-pos/features/payroll-user-info/schema";
import { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

export const payrollUserInfoApi = {
    get: async () => {
        const data = await apiFetch<unknown>("/api/payroll-user-info");
        if (!data) return null;
        return PayrollUserInfoResponse.parse(data);
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
