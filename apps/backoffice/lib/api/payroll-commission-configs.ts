import { apiFetch } from "./client";
import {
    PayrollCommissionConfigListResponse,
    PayrollCommissionConfigResponse,
    type CreatePayrollCommissionConfigInput,
    type UpdatePayrollCommissionConfigInput,
} from "@tea-pos/features/payroll-commission-configs/schema";

export const payrollCommissionConfigsApi = {
    list: async () => {
        return PayrollCommissionConfigListResponse.parse(
            await apiFetch<unknown>("/api/payroll/commission-types"),
        );
    },

    create: async (input: CreatePayrollCommissionConfigInput) => {
        return apiFetch<unknown>("/api/payroll/commission-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        });
    },

    update: async (id: string, input: UpdatePayrollCommissionConfigInput) => {
        return PayrollCommissionConfigResponse.parse(
            await apiFetch<unknown>(`/api/payroll/commission-types/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
