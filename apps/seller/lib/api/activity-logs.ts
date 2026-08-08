import { apiFetch, buildParams } from "./client";
import type { DayActivityResponse } from "@tea-pos/features/activity-logs/schema";

export const activityLogsApi = {
    dayActivity: async (params: { summaryId: string }) => {
        const sp = buildParams(params);
        return apiFetch<DayActivityResponse>(`/api/activity-logs/day-activity?${sp}`);
    },
};
