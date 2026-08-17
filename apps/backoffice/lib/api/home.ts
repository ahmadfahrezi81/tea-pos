import { apiFetch, buildParams } from "./client";
import { TenantDailyTotalsResponse } from "@tea-pos/features/analytics/schema";
import { TenantSessionActivityResponse } from "@tea-pos/features/sessions/schema";

export const homeApi = {
    dailySales: async (days: number, storeId?: string) =>
        TenantDailyTotalsResponse.parse(
            await apiFetch<unknown>(`/api/home/daily-sales?${buildParams({ days, storeId })}`),
        ),

    workDays: async (weeks: number, storeId?: string) =>
        TenantSessionActivityResponse.parse(
            await apiFetch<unknown>(`/api/home/work-days?${buildParams({ weeks, storeId })}`),
        ),
};
