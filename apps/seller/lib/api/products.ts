import { apiFetch, buildParams } from "./client";
import type { ListProductsQuery } from "@tea-pos/features/products/schema";
import { ProductListResponse } from "@tea-pos/features/products/schema";

export const productsApi = {
    list: async (params: Partial<ListProductsQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ProductListResponse.parse(await apiFetch<unknown>(`/api/products?${sp}`));
    },
};
