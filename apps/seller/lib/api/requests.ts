import { apiFetch, buildParams } from "./client";
import type {
    CreateSupplyRequestInput,
    SupplyRequestResponse,
    SupplyRequestListResponse,
} from "@tea-pos/features/requests/schema";

export const requestsApi = {
    list: async (params: { storeId: string; date?: string }) => {
        const sp = buildParams(params);
        return apiFetch<SupplyRequestListResponse>(`/api/requests?${sp}`);
    },
    create: async (input: CreateSupplyRequestInput) => {
        return apiFetch<SupplyRequestResponse>("/api/requests", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },
};
