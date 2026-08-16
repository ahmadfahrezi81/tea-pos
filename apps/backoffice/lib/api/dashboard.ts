import { apiFetch, buildParams } from "./client";
import { TenantDailyTotalsResponse } from "@tea-pos/features/analytics/schema";
import { TenantSessionActivityResponse } from "@tea-pos/features/sessions/schema";

export const dashboardApi = {
    dailySales: async (days: number) =>
        TenantDailyTotalsResponse.parse(
            await apiFetch<unknown>(`/api/dashboard/daily-sales?${buildParams({ days })}`),
        ),

    workDays: async (weeks: number) =>
        TenantSessionActivityResponse.parse(
            await apiFetch<unknown>(`/api/dashboard/work-days?${buildParams({ weeks })}`),
        ),
};
