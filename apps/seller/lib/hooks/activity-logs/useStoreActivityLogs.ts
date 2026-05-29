import useSWR from "swr";
import { activityLogsApi } from "@/lib/api/activity-logs";
import type { TimelineEventResponse } from "@tea-pos/features/activity-logs/schema";

export function useStoreActivityLogs(storeId?: string, date?: string) {
    const { data = [], ...rest } = useSWR<TimelineEventResponse[]>(
        storeId && date ? `activity-logs-${storeId}-${date}` : null,
        () => activityLogsApi.list({ storeId: storeId!, date: date! }),
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );
    return { events: data, ...rest };
}
