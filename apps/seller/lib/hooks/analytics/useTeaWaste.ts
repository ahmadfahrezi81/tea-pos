import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";
import { SWR } from "@tea-pos/utils/swr";

export interface TeaWasteData {
    date: string;
    liters: number;
}

export default function useTeaWaste(storeId: string | null, month: string) {
    const key = storeId && month ? `tea-waste-${storeId}-${month}` : null;

    return useSWR<TeaWasteData[]>(
        key,
        () => analyticsApi.getTeaWaste({ storeId: storeId!, month }).then((r) => r.data),
        {
            dedupingInterval: SWR.STATIC,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
