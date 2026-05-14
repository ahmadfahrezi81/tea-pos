"use client";

import useSWR from "swr";
import { ordersApi } from "@/lib/api/orders";
import { commissionConfigsApi } from "@/lib/api/commission-configs";

interface TodayCupsResult {
    totalCups: number;
    estimatedEarnings: number;
    ratePerCup: number;
}

export function useTodayCups(storeId?: string, userId?: string, date?: string) {
    const key = storeId && userId && date ? `today-cups-${storeId}-${userId}-${date}` : null;

    return useSWR<TodayCupsResult>(
        key,
        async () => {
            const [ordersResult, rateResult] = await Promise.all([
                ordersApi.list({ storeId: storeId!, date: date! }),
                commissionConfigsApi.getRate({ userId: userId! }),
            ]);

            const totalCups = ordersResult.orders
                .filter((o) => o.userId === userId)
                .reduce(
                    (sum, o) => sum + o.orderItems.reduce((s, item) => s + item.quantity, 0),
                    0,
                );

            const ratePerCup = rateResult.rate;

            return {
                totalCups,
                estimatedEarnings: totalCups * ratePerCup,
                ratePerCup,
            };
        },
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );
}
