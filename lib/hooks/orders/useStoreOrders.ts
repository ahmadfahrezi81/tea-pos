// lib/hooks/orders/useStoreOrders.ts
import useSWR from "swr";
import { Order, OrderListResponse } from "@/lib/schemas/orders";

interface UseStoreOrdersParams {
    storeId: string | null;
    date: string; // Format: YYYY-MM-DD
}

const fetchStoreOrders = async ({
    storeId,
    date,
}: UseStoreOrdersParams): Promise<Order[]> => {
    if (!storeId) return [];

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    if (date) params.append("date", date);

    const res = await fetch(`/api/orders?${params.toString()}`);
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

    // ✅ validate client-side (optional, since backend already validates)
    const parsed = OrderListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid orders response on client:",
            parsed.error.format()
        );
        return [];
    }

    return parsed.data.orders;
};

export default function useStoreOrders(storeId: string | null, date: string) {
    const key = storeId && date ? `orders-${storeId}-${date}` : null;

    return useSWR<Order[]>(key, () => fetchStoreOrders({ storeId, date }), {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
}
