import { apiFetch } from "./client";
import { TenantStoreListResponse } from "@tea-pos/features/stores/schema";

export const storesApi = {
    list: async () => TenantStoreListResponse.parse(await apiFetch<unknown>("/api/stores")),
};
