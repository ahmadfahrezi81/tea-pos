import { apiFetch, buildParams } from "./client";
import type { TimelineEventResponse, DayActivityResponse } from "@tea-pos/features/activity-logs/schema";

export const activityLogsApi = {
    list: async (params: { storeId: string; date: string }) => {
        const sp = buildParams(params);
        return apiFetch<TimelineEventResponse[]>(`/api/activity-logs?${sp}`);
    },
    dayActivity: async (params: { summaryId: string }) => {
        const sp = buildParams(params);
        return apiFetch<DayActivityResponse>(`/api/activity-logs/day-activity?${sp}`);
    },
};
