import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";

export interface DailySalesData {
    date: string;
    cups: number;
}

export default function useDailySales(storeId: string | null, month: string) {
    const key = storeId && month ? `daily-sales-${storeId}-${month}` : null;

    return useSWR<DailySalesData[]>(
        key,
        () => analyticsApi.getDailySales({ storeId: storeId!, month }).then((r) => r.data),
        {
            revalidateOnFocus: false,
            dedupingInterval: 900000,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
