"use client";
import { SWRConfig, unstable_serialize } from "swr";
import type { StoreListResponse } from "@tea-pos/features/stores/schema";
import type { Flags } from "@/lib/api/flags";

/**
 * Seeds the SWR cache with what the mobile layout already fetched on the server,
 * so no consumer has to wait for a round trip it could have skipped.
 *
 * `SWRConfig.fallback` rather than each hook's own `fallbackData`, because
 * `fallbackData` is per-hook and never reaches the shared cache: `useStores()`
 * has two callers — `StoreProvider`, and `MobileLayoutClient`, which gates the
 * boot loader on it — and only a cache entry satisfies both.
 *
 * Both keys are written the way their hooks write them. `useStores` passes a
 * plain string, which SWR uses as-is; `FlagsProvider` passes an array, which has
 * to go through `unstable_serialize` to produce the same cache key. If either
 * hook changes its key, seeding silently stops working — the app still boots,
 * just slower — so they have to be kept in step.
 */
export function BootFallback({
    stores,
    flags,
    flagsStoreId,
    children,
}: {
    stores: StoreListResponse | null;
    flags: Flags | null;
    /** The store id the client will resolve to on its first render. */
    flagsStoreId: string;
    children: React.ReactNode;
}) {
    const fallback: Record<string, unknown> = {};
    if (stores) fallback["stores-all"] = stores;
    if (flags) fallback[unstable_serialize(["flags", flagsStoreId])] = flags;

    return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
