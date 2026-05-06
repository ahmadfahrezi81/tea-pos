import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";
import type { DayOfWeekSalesResponse } from "@tea-pos/features/analytics/schema";

export interface DayOfWeekSalesData {
    dayOfWeek: string;
    dayIndex: number;
    averageCups: number;
    totalCups: number;
    occurrences: number;
}

export default function useDayOfWeekSales(storeId: string | null, month: string) {
    const key = storeId && month ? `day-of-week-sales-${storeId}-${month}` : null;

    return useSWR<DayOfWeekSalesResponse>(
        key,
        () => analyticsApi.getDayOfWeekSales({ storeId: storeId!, month }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
