import { apiFetch } from "./client";
import type { DailySalesQuery, HourlySalesQuery, ProductSalesQuery, DayOfWeekSalesQuery } from "@tea-pos/features/analytics/schema";
import { DailySalesResponse, HourlySalesResponse, ProductSalesResponse, DayOfWeekSalesResponse } from "@tea-pos/features/analytics/schema";

export const analyticsApi = {
    getDailySales: async (params: Partial<DailySalesQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return DailySalesResponse.parse(await apiFetch<unknown>(`/api/analytics/daily-sales?${sp}`));
    },
    getHourlySales: async (params: Partial<HourlySalesQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return HourlySalesResponse.parse(await apiFetch<unknown>(`/api/analytics/hourly-sales?${sp}`));
    },
    getProductSales: async (params: Partial<ProductSalesQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return ProductSalesResponse.parse(await apiFetch<unknown>(`/api/analytics/product-sales?${sp}`));
    },
    getDayOfWeekSales: async (params: Partial<DayOfWeekSalesQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return DayOfWeekSalesResponse.parse(await apiFetch<unknown>(`/api/analytics/day-of-week-sales?${sp}`));
    },
};
