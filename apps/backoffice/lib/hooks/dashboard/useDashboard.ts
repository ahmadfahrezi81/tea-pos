"use client";

import useSWR from "swr";
import { dashboardApi } from "@/lib/api/dashboard";

/* Both series move at most once a day, when a store closes — so they are
   deduped for a minute and never revalidated on focus. Switching tabs back to
   the dashboard should cost nothing. */
const swrOptions = { revalidateOnFocus: false, dedupingInterval: 60_000 };

export function useDailySales(days = 14) {
    const { data, isLoading, error } = useSWR(
        ["dashboard-daily-sales", days],
        () => dashboardApi.dailySales(days),
        swrOptions,
    );

    return { points: data?.points ?? [], totals: data?.totals, isLoading, error };
}

export function useWorkDays(weeks = 4) {
    const { data, isLoading } = useSWR(
        ["dashboard-work-days", weeks],
        () => dashboardApi.workDays(weeks),
        swrOptions,
    );

    return { dates: data?.dates ?? [], isLoading };
}
