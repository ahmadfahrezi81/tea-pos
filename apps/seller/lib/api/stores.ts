import { apiFetch } from "./client";
import { StoreListResponse } from "@tea-pos/features/stores/schema";

export const storesApi = {
    list: async () => {
        return StoreListResponse.parse(await apiFetch<unknown>("/api/stores"));
    },

    /** Remember which store this user's app opens on — see task 064. */
    setDefault: async (storeId: string) => {
        await apiFetch<unknown>("/api/stores/default", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeId }),
        });
    },
};
