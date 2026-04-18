// lib/hooks/orders/useOrdersList.ts
import useSWR from "swr";
import {
    OrderListItem,
    AllOrdersListResponse,
} from "@/lib/shared/schemas/order-list";

interface UseOrdersListParams {
    storeIds: string[]; // Array of store IDs, empty array means all stores
    date: string; // Format: YYYY-MM-DD
    productIds?: string[]; // Optional product filter
}

const fetchOrdersList = async ({
    storeIds,
    date,
    productIds,
}: UseOrdersListParams): Promise<OrderListItem[]> => {
    const params = new URLSearchParams();

    // Add date (required)
    params.append("date", date);

    // Add store IDs if specified
    if (storeIds.length > 0) {
        params.append("storeIds", storeIds.join(","));
    }

    // Add product IDs if specified
    if (productIds && productIds.length > 0) {
        params.append("productIds", productIds.join(","));
    }

    const res = await fetch(`/api/orders/list?${params.toString()}`);
    if (!res.ok) {
        let errMsg = `Failed to fetch orders: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // Validate client-side
    const parsed = AllOrdersListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid orders list response on client:",
            parsed.error.format(),
        );
        return [];
    }

    return parsed.data.orders;
};

/**
 * Hook to fetch orders from multiple stores for a specific date
 * @param storeIds - Array of store IDs to filter (empty = all stores)
 * @param date - Date to filter orders (YYYY-MM-DD format)
 * @param productIds - Optional array of product IDs to filter
 */
export default function useOrdersList(
    storeIds: string[],
    date: string,
    productIds?: string[],
) {
    // Create a cache key based on the parameters
    const storeKey = storeIds.length > 0 ? storeIds.sort().join(",") : "all";
    const productKey = productIds?.length
        ? productIds.sort().join(",")
        : "none";
    const key = date ? `orders-list-${storeKey}-${date}-${productKey}` : null;

    return useSWR<OrderListItem[]>(
        key,
        () => fetchOrdersList({ storeIds, date, productIds }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        },
    );
}
