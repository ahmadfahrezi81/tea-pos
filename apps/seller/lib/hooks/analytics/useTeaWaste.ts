import useSWR from "swr";
import { analyticsApi } from "@/lib/api/analytics";

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
            revalidateOnFocus: false,
            dedupingInterval: 900000,
            refreshInterval: 0,
            keepPreviousData: true,
        },
    );
}
