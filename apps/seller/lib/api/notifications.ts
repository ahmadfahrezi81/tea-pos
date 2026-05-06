import { apiFetch } from "./client";
import type { ListNotificationsQuery } from "@tea-pos/features/notifications/schema";
import { NotificationListResponse, MarkOneReadResponse } from "@tea-pos/features/notifications/schema";

export const notificationsApi = {
    list: async (params: Partial<ListNotificationsQuery>) => {
        const sp = new URLSearchParams(params as Record<string, string>);
        return NotificationListResponse.parse(await apiFetch<unknown>(`/api/notifications?${sp}`));
    },
    markRead: async (id: string) => {
        return MarkOneReadResponse.parse(await apiFetch<unknown>(`/api/notifications/${encodeURIComponent(id)}/read`, {
            method: "PATCH",
        }));
    },
};
