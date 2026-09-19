import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";
import { SWR } from "@tea-pos/utils/swr";

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
            dedupingInterval: SWR.STATIC,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
