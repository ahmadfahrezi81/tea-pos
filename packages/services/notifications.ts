import type { SupabaseClient } from "@supabase/supabase-js";
import {
    NotificationType,
    NotificationTargetRole,
} from "@tea-pos/features/notifications/schema";

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
