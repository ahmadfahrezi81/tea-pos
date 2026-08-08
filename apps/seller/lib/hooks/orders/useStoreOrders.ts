import useSWR from "swr";
import { ordersApi } from "@/lib/api/orders";
import type { OrderListResponse } from "@tea-pos/features/orders/schema";

/**
 * The day's orders, newest first, capped by `limit`.
 *
 * `totals` comes back alongside and describes the whole day regardless of the
 * cap, so anything summarising the day reads from there rather than reducing
 * over `orders`.
 *
 * `keepPreviousData` matters when the caller raises the limit: without it the
 * list unmounts into a loading state and the reader loses their scroll
 * position, which is the one interaction this cap adds.
 */
/**
 * Matches every cached orders list for a store, across all dates and limits.
 *
 * Anything that changes the day's orders should invalidate through this rather
 * than rebuilding the key by hand. The key carries a `limit`, so a hand-built
 * key only matches if the caller happens to guess the limit currently on
 * screen — and the date has to be app-time, which is its own way to get it
 * wrong. Both mistakes were live: `useCreateOrder` and `useQrisPayment` each
 * passed a string key against this array key, so placing an order never
 * refreshed the list at all.
 */
export function matchStoreOrders(storeId: string) {
    return (key: unknown) =>
        Array.isArray(key) && key[0] === "orders" && key[1] === storeId;
}

export default function useStoreOrders(
    storeId: string | null,
    date: string,
    limit?: number,
) {
    const key = storeId && date ? (["orders", storeId, date, limit] as const) : null;

    return useSWR<OrderListResponse>(
        key,
        () => ordersApi.list({ storeId: storeId!, date, limit }),
        { revalidateOnFocus: false, dedupingInterval: 30_000, keepPreviousData: true },
    );
}
