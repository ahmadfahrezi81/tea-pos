import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";
import type { DayOfWeekSalesResponse } from "@tea-pos/features/analytics/schema";
import { SWR } from "@tea-pos/utils/swr";

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
            dedupingInterval: SWR.COLD,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
