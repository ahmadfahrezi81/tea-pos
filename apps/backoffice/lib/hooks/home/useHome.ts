"use client";

import useSWR from "swr";
import { homeApi } from "@/lib/api/home";

/* Both series move at most once a day, when a store closes — so they are
   deduped for a minute and never revalidated on focus. Switching tabs back to
   home should cost nothing.

   `storeId` is part of the key rather than a filter applied after the fetch:
   each store's window is its own series, and switching back to one already
   looked at is served from cache. An empty id means every active store. */
const swrOptions = { revalidateOnFocus: false, dedupingInterval: 60_000 };

export function useDailySales(days = 14, storeId = "") {
    const { data, isLoading, error } = useSWR(
        ["home-daily-sales", days, storeId],
        () => homeApi.dailySales(days, storeId || undefined),
        swrOptions,
    );

    return { points: data?.points ?? [], totals: data?.totals, isLoading, error };
}

export function useWorkDays(weeks = 4, storeId = "") {
    const { data, isLoading } = useSWR(
        ["home-work-days", weeks, storeId],
        () => homeApi.workDays(weeks, storeId || undefined),
        swrOptions,
    );

    return { dates: data?.dates ?? [], isLoading };
}
