import useSWR from "swr";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationListResponse, NotificationType } from "@tea-pos/features/notifications/schema";

interface UseNotificationsParams {
    isRead?: boolean;
    type?: NotificationType;
}

export default function useNotifications(params: UseNotificationsParams = {}) {
    const { isRead, type } = params;
    const key = `notifications-${isRead ?? "all"}-${type ?? "all"}`;

    return useSWR<NotificationListResponse>(
        key,
        () => notificationsApi.list({
            ...(isRead !== undefined && { isRead }),
            ...(type && { type }),
        }),
        { revalidateOnFocus: true, dedupingInterval: 5000 },
    );
}
