import { apiFetch, buildParams } from "./client";
import type { DailySalesQuery, HourlySalesQuery, ProductSalesQuery, DayOfWeekSalesQuery } from "@tea-pos/features/analytics/schema";
import { DailySalesResponse, HourlySalesResponse, ProductSalesResponse, DayOfWeekSalesResponse } from "@tea-pos/features/analytics/schema";

export const analyticsApi = {
    getDailySales: async (params: Partial<DailySalesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return DailySalesResponse.parse(await apiFetch<unknown>(`/api/analytics/daily-sales?${sp}`));
    },
    getHourlySales: async (params: Partial<HourlySalesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return HourlySalesResponse.parse(await apiFetch<unknown>(`/api/analytics/hourly-sales?${sp}`));
    },
    getProductSales: async (params: Partial<ProductSalesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ProductSalesResponse.parse(await apiFetch<unknown>(`/api/analytics/product-sales?${sp}`));
    },
    getDayOfWeekSales: async (params: Partial<DayOfWeekSalesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return DayOfWeekSalesResponse.parse(await apiFetch<unknown>(`/api/analytics/day-of-week-sales?${sp}`));
    },
};
