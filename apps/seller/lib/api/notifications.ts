import { apiFetch, buildParams } from "./client";
import type { ListNotificationsQuery } from "@tea-pos/features/notifications/schema";
import { NotificationListResponse, MarkOneReadResponse } from "@tea-pos/features/notifications/schema";

export const notificationsApi = {
    list: async (params: Partial<ListNotificationsQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return NotificationListResponse.parse(await apiFetch<unknown>(`/api/notifications?${sp}`));
    },
    markRead: async (id: string) => {
        return MarkOneReadResponse.parse(await apiFetch<unknown>(`/api/notifications/${encodeURIComponent(id)}/read`, {
            method: "PATCH",
        }));
    },
};
