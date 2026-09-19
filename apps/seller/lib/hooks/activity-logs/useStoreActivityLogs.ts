import useSWR from "swr";
import { activityLogsApi } from "@/lib/api/activity-logs";
import type { DayActivityResponse } from "@tea-pos/features/activity-logs/schema";
import { SWR } from "@tea-pos/utils/swr";

export function useDayActivity(summaryId?: string) {
    const { data, ...rest } = useSWR<DayActivityResponse>(
        summaryId ? `day-activity-${summaryId}` : null,
        () => activityLogsApi.dayActivity({ summaryId: summaryId! }),
        { dedupingInterval: SWR.COOL },
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
