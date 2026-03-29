// lib/utils/notifications.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import {
    NotificationType,
    NotificationTargetRole,
} from "@/lib/schemas/notifications";
import type { Json } from "@/lib/db.types";

interface CreateNotificationParams {
    tenantId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown> | null;
    targetRole?: NotificationTargetRole | null;
    recipientId?: string | null;
}

/**
 * Server-side utility to create a notification event.
 * Used by cron jobs, API route triggers, and any server-side action.
 *
 * Targeting rules:
 * - targetRole only   → broadcast to all users of that role in the tenant
 * - recipientId only  → targeted to a specific user
 * - neither           → global broadcast to all users in the tenant
 */
export async function createNotification({
    tenantId,
    type,
    title,
    body,
    metadata = null,
    targetRole = null,
    recipientId = null,
}: CreateNotificationParams): Promise<{ success: boolean; error?: string }> {
    if (targetRole && recipientId) {
        return {
            success: false,
            error: "targetRole and recipientId are mutually exclusive",
        };
    }

    try {
        const supabase = await createRouteHandlerClient();

        const { error } = await supabase.from("notification_events").insert({
            tenant_id: tenantId,
            type,
            title,
            body,
            metadata: (metadata ?? null) as Json,
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
