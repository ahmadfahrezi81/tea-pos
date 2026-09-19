"use client";

import useSWR from "swr";
import { storesApi } from "@/lib/api/stores";
import { SWR } from "@tea-pos/utils/swr";

/* The store list changes about as often as a shop is opened or retired, so it
   is fetched once and left alone for the session. */
export function useStores() {
    const { data, isLoading } = useSWR("stores-all", () => storesApi.list(), {
        dedupingInterval: SWR.COLD,
    });

    return { stores: data?.stores ?? [], isLoading };
}
