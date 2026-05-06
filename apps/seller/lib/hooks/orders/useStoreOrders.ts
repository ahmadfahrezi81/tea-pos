import useSWR from "swr";
import { ordersApi } from "@/lib/api/orders";
import type { Order } from "@tea-pos/features/orders/schema";

export default function useStoreOrders(storeId: string | null, date: string) {
    const key = storeId && date ? `orders-${storeId}-${date}` : null;

    return useSWR<Order[]>(
        key,
        () => ordersApi.list({ storeId: storeId!, date }).then((r) => r.orders),
        { revalidateOnFocus: true, dedupingInterval: 5000 },
    );
}
