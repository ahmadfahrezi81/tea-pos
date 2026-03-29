// lib/hooks/notifications/useNotifications.ts
import useSWR from "swr";
import {
    NotificationListResponse,
    NotificationType,
} from "@/lib/schemas/notifications";

interface UseNotificationsParams {
    isRead?: boolean;
    type?: NotificationType;
}

const fetchNotifications = async ({
    isRead,
    type,
}: UseNotificationsParams): Promise<NotificationListResponse> => {
    const params = new URLSearchParams();

    if (isRead !== undefined) {
        params.append("isRead", String(isRead));
    }

    if (type) {
        params.append("type", type);
    }

    const res = await fetch(`/api/notifications?${params.toString()}`);

    if (!res.ok) {
        let errMsg = `Failed to fetch notifications: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    const parsed = NotificationListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid notifications response on client:",
            parsed.error.format(),
        );
        return { notifications: [], unreadCount: 0 };
    }

    return parsed.data;
};

export default function useNotifications(params: UseNotificationsParams = {}) {
    const { isRead, type } = params;

    const key = `notifications-${isRead ?? "all"}-${type ?? "all"}`;

    return useSWR<NotificationListResponse>(
        key,
        () => fetchNotifications({ isRead, type }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        },
    );
}
