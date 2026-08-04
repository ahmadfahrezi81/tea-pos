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
