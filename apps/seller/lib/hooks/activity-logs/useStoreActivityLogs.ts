import useSWR from "swr";
import { activityLogsApi } from "@/lib/api/activity-logs";
import type {
    TimelineEventResponse,
    DayActivityResponse,
} from "@tea-pos/features/activity-logs/schema";

export function useStoreActivityLogs(storeId?: string, date?: string) {
    const { data = [], ...rest } = useSWR<TimelineEventResponse[]>(
        storeId && date ? `activity-logs-${storeId}-${date}` : null,
        () => activityLogsApi.list({ storeId: storeId!, date: date! }),
        { revalidateOnFocus: false, dedupingInterval: 10000 },
    );
    return { events: data, ...rest };
}

export function useDayActivity(summaryId?: string) {
    const { data, ...rest } = useSWR<DayActivityResponse>(
        summaryId ? `day-activity-${summaryId}` : null,
        () => activityLogsApi.dayActivity({ summaryId: summaryId! }),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );
    return {
        summary: data?.summary ?? null,
        segments: data?.segments ?? [],
        ...rest,
    };
}

export function useDayActivityBigEvents(summaryId?: string) {
    const { segments, ...rest } = useDayActivity(summaryId);
    const bigEvents = segments.filter(
        (s) =>
            s.type !== "order_created" && s.type !== "summary_photo_uploaded",
    );
    return { segments: bigEvents, ...rest };
}
