import { apiFetch, buildParams } from "./client";
import type { TimelineEventResponse } from "@tea-pos/features/activity-logs/schema";

export const activityLogsApi = {
    list: async (params: { storeId: string; date: string }) => {
        const sp = buildParams(params);
        return apiFetch<TimelineEventResponse[]>(`/api/activity-logs?${sp}`);
    },
};
