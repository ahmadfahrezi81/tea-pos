import { apiFetch } from "./client";
import { StoreListResponse } from "@tea-pos/features/stores/schema";

export const storesApi = {
    list: async () => {
        return StoreListResponse.parse(await apiFetch<unknown>("/api/stores"));
    },
};
