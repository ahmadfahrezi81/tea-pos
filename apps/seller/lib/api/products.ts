import { apiFetch } from "./client";
import type { ListProductsQuery } from "@tea-pos/features/products/schema";
import { ProductListResponse } from "@tea-pos/features/products/schema";

export const productsApi = {
    list: async (params: Partial<ListProductsQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return ProductListResponse.parse(await apiFetch<unknown>(`/api/products?${sp}`));
    },
};
