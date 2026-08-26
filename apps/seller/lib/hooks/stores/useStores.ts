import useSWR from "swr";
import { storesApi } from "@/lib/api/stores";
import type { StoreListResponse } from "@tea-pos/features/stores/schema";

/**
 * The store list, seeded by `BootFallback` from the read the mobile layout
 * already did.
 *
 * `revalidateIfStale: false` is the point of this file. SWR's initial-fetch
 * decision is `isUndefined(data) || revalidateIfStale`, and data *is* defined —
 * `BootFallback` puts it in the cache before the first render — so with the
 * default `true` every boot fetched the same rows a second time over the
 * network, having just been handed them by the server. `revalidateOnFocus` does
 * not cover this and neither does the dedupe window; only this option does.
 *
 * What it costs, and it is close to nothing: a store assignment edited while
 * the app is open no longer appears until the next boot. `app/api/stores` is
 * GET-only and no seller screen can change the roster — assignments are edited
 * in backoffice, a separate deployment — so there is no in-app action whose
 * result this delays. The server read is cached for 60s regardless, so the
 * window was never tight.
 *
 * If seller ever gains a screen that changes assignments, that screen calls
 * `mutate("stores-all")`. It must not be fixed by turning this option back on.
 */
export function useStores() {
    return useSWR<StoreListResponse>("stores-all", () => storesApi.list(), {
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 60000,
    });
}
