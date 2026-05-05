import type { SupabaseClient } from "@supabase/supabase-js";
import {
    NotificationType,
    NotificationTargetRole,
} from "@tea-pos/features/notifications/schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export interface ListNotificationsParams {
    tenantId: string;
    userId: string;
    userRole: string;
    isRead?: string;
    type?: string;
}

export async function listNotifications(supabase: SupabaseClient, params: ListNotificationsParams) {
    const { tenantId, userId, userRole, isRead, type } = params;

    let query = supabase
        .from("notification_events")
        .select(`*, notification_reads(id, recipient_id, is_read, read_at)`)
        .eq("tenant_id", tenantId)
        .or(`target_role.eq.${userRole},recipient_id.eq.${userId},and(target_role.is.null,recipient_id.is.null)`)
        .order("created_at", { ascending: false });

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    const notifications = (data ?? []).map((event) => {
        const readRecord = event.notification_reads?.find(
            (r: { recipient_id: string }) => r.recipient_id === userId,
        );
        return {
            ...event,
            isRead: readRecord?.is_read ?? false,
            readAt: readRecord?.read_at ?? null,
            notification_reads: undefined,
        };
    });

    const filtered = isRead !== undefined
        ? notifications.filter((n) => n.isRead === (isRead === "true"))
        : notifications;

    return {
        notifications: toCamelKeys(filtered),
        unreadCount: notifications.filter((n) => !n.isRead).length,
    };
}

interface CreateNotificationParams {
    tenantId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown> | null;
    targetRole?: NotificationTargetRole | null;
    recipientId?: string | null;
}

export async function createNotification(
    supabase: SupabaseClient,
    {
        tenantId,
        type,
        title,
        body,
        metadata = null,
        targetRole = null,
        recipientId = null,
    }: CreateNotificationParams,
): Promise<{ success: boolean; error?: string }> {
    if (targetRole && recipientId) {
        return {
            success: false,
            error: "targetRole and recipientId are mutually exclusive",
        };
    }

    try {
        const { error } = await supabase.from("notification_events").insert({
            tenant_id: tenantId,
            type,
            title,
            body,
            metadata: (metadata ?? null) as unknown,
            target_role: targetRole,
            recipient_id: recipientId,
        });

        if (error) {
            console.error("[createNotification] Supabase error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("[createNotification] Unexpected error:", err);
        return {
            success: false,
            error: "Unexpected error creating notification",
        };
    }
}
