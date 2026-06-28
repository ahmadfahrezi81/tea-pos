import useSWR from "swr";
import { sessionsApi } from "@/lib/api/sessions";

export function useSessionsByMonth(storeId: string | undefined, month: string | undefined) {
    return useSWR(
        storeId && month ? ["sessions-by-month", storeId, month] : null,
        () => sessionsApi.listByMonth({ storeId: storeId!, month: month! }),
        { dedupingInterval: 5000, revalidateOnFocus: false },
    );
}
