import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";

export interface HourlySalesData {
    hour: string;
    cups: number;
}

export default function useHourlySales(storeId: string | null, date: string) {
    const key = storeId && date ? `hourly-sales-${storeId}-${date}` : null;

    return useSWR<HourlySalesData[]>(
        key,
        () => analyticsApi.getHourlySales({ storeId: storeId!, date }).then((r) => r.data),
        { revalidateOnFocus: false, dedupingInterval: 300000 },
    );
}
