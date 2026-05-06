/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/hooks/analytics/useRecentOrders.ts
import useSWR from "swr";

export interface RecentOrderItem {
    quantity: number;
    product: {
        name: string;
    } | null;
}

export interface RecentOrder {
    id: string;
    store: string;
    seller: string;
    items: RecentOrderItem[];
    time: string;
}

interface UseRecentOrdersParams {
    limit?: number;
}

const fetchRecentOrders = async ({
    limit = 20,
}: UseRecentOrdersParams): Promise<RecentOrder[]> => {
    // Get today's date for the API call
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    const params = new URLSearchParams();
    params.append("date", dateStr);

    const res = await fetch(`/api/orders/list?${params.toString()}`);

    if (!res.ok) {
        let errMsg = `Failed to fetch recent orders: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // Transform API response to RecentOrder format and limit to most recent
    const orders: RecentOrder[] = (json.orders || [])
        .slice(0, limit) // Only take the first 'limit' orders (they're already sorted by created_at desc)
        .map((order: any) => {
            // Format time only (HH:MM AM/PM)
            // const createdAt = new Date(order.createdAt);
            // const timeLabel = createdAt.toLocaleTimeString("en-US", {
            //     hour: "numeric",
            //     minute: "2-digit",
            //     hour12: true,
            //     timeZone: "Asia/Jakarta", // Jakarta Time Zone (UTC+7)
            // });

            const createdAt = new Date(order.createdAt + "Z"); // Add 'Z' if not present to force UTC parsing
            const timeLabel = createdAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Jakarta",
            });

            return {
                id: order.id,
                store: order.store?.name || "Unknown Store",
                seller: order.seller?.fullName || "Unknown Seller",
                items:
                    order.items?.map((item: any) => ({
                        quantity: item.quantity,
                        product: item.product
                            ? { name: item.product.name }
                            : null,
                    })) || [],
                time: timeLabel,
            };
        });

    return orders;
};

export default function useRecentOrders(limit: number = 20) {
    const key = `recent-orders-${limit}`;

    return useSWR<RecentOrder[]>(key, () => fetchRecentOrders({ limit }), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        refreshInterval: 30000, // Refresh every 30 seconds for recent orders
    });
}
