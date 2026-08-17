"use client";

import useSWR from "swr";
import { storesApi } from "@/lib/api/stores";

/* The store list changes about as often as a shop is opened or retired, so it
   is fetched once and left alone for the session. */
export function useStores() {
    const { data, isLoading } = useSWR("stores-all", () => storesApi.list(), {
        revalidateOnFocus: false,
        dedupingInterval: 300_000,
    });

    return { stores: data?.stores ?? [], isLoading };
}
