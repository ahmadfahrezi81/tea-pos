import { apiFetch, buildParams } from "./client";
import type { ListOrdersQuery, CreateOrderInput } from "@tea-pos/features/orders/schema";
import { OrderListResponse, CreateOrderResponse } from "@tea-pos/features/orders/schema";

export const ordersApi = {
    list: async (params: Partial<ListOrdersQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return OrderListResponse.parse(await apiFetch<unknown>(`/api/orders?${sp}`));
    },
    create: async (input: CreateOrderInput) => {
        return CreateOrderResponse.parse(await apiFetch<unknown>("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
};
