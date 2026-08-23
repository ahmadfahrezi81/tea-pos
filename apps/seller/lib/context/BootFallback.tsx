"use client";
import { SWRConfig } from "swr";
import type { StoreListResponse } from "@tea-pos/features/stores/schema";

/**
 * Seeds the SWR cache with the store list the mobile layout already fetched, so
 * nothing has to wait for `/api/stores` before it can render.
 *
 * `SWRConfig.fallback` rather than the hook's own `fallbackData`, because
 * `fallbackData` is per-hook and never reaches the shared cache: `useStores()`
 * has two callers — `StoreProvider`, and `MobileLayoutClient`, which gates the
 * boot loader on it — and only a cache entry satisfies both.
 *
 * The key is the literal string `useStores` passes to `useSWR`. If that key ever
 * changes this silently stops working — the app still boots, just slower — so
 * the two have to be kept in step.
 *
 * Flags deliberately are **not** seeded here. Evaluating them server-side meant a
 * blocking call to PostHog inside a layout that runs for every screen and every
 * prefetch of one; it cost far more than the round trip it saved. They are
 * fetched by `FlagsContext` after hydration, where nothing waits on them.
 */
export function BootFallback({
    stores,
    children,
}: {
    stores: StoreListResponse | null;
    children: React.ReactNode;
}) {
    return (
        <SWRConfig value={{ fallback: stores ? { "stores-all": stores } : {} }}>
            {children}
        </SWRConfig>
    );
}
