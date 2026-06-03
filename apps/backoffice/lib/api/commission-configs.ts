import { apiFetch, buildParams } from "./client";
import type { GetCommissionRateQuery, UpsertCommissionConfigInput } from "@tea-pos/features/commission-configs/schema";
import { CommissionRateResponse, CommissionConfigResponse } from "@tea-pos/features/commission-configs/schema";

export const commissionConfigsApi = {
    getRate: async (params: GetCommissionRateQuery) => {
        const sp = buildParams(params as Record<string, unknown>);
        return CommissionRateResponse.parse(await apiFetch<unknown>(`/api/commission-configs?${sp}`));
    },

    upsert: async (input: UpsertCommissionConfigInput) => {
        return CommissionConfigResponse.parse(
            await apiFetch<unknown>("/api/commission-configs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
