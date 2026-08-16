import { apiFetch } from "./client";
import {
    TenantPayFrequencyResponse,
    type UpdateTenantPayFrequencyInput,
} from "@tea-pos/features/tenants/schema";

export const tenantConfigApi = {
    getPayFrequency: async () =>
        TenantPayFrequencyResponse.parse(await apiFetch<unknown>("/api/tenant-config/pay-frequency")),

    setPayFrequency: async (input: UpdateTenantPayFrequencyInput) =>
        TenantPayFrequencyResponse.parse(
            await apiFetch<unknown>("/api/tenant-config/pay-frequency", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        ),
};
