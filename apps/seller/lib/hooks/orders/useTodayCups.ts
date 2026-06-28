"use client";

import useSWR from "swr";
import { ordersApi } from "@/lib/api/orders";

export function useTodayCups(storeId?: string, userId?: string, date?: string) {
    const key = storeId && userId && date ? `today-cups-${storeId}-${userId}-${date}` : null;

    return useSWR<{ totalCups: number }>(
        key,
        async () => {
            const ordersResult = await ordersApi.list({ storeId: storeId!, date: date! });
            const totalCups = ordersResult.orders
                .filter((o) => o.userId === userId)
                .reduce(
                    (sum, o) => sum + o.storeOrderItems.reduce((s, item) => s + item.quantity, 0),
                    0,
                );
            return { totalCups };
        },
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );
}
