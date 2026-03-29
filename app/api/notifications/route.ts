// app/api/notifications/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateNotificationInput,
    NotificationListResponse,
} from "@/lib/schemas/notifications";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/notifications
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Fetch current user's profile to get their role
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 },
            );
        }

        const isRead = searchParams.get("isRead");
        const type = searchParams.get("type");

        // Fetch notification events visible to this user:
        // - broadcast to their role (target_role = their role)
        // - targeted directly to them (recipient_id = their id)
        // - global broadcast (both target_role and recipient_id are null)
        let query = supabase
            .from("notification_events")
            .select(
                `
                    *,
                    notification_reads(
                        id,
                        recipient_id,
                        is_read,
                        read_at
                    )
                `,
            )
            .eq("tenant_id", currentTenantId)
            .or(
                `target_role.eq.${profile.role},recipient_id.eq.${user.id},and(target_role.is.null,recipient_id.is.null)`,
            )
            .order("created_at", { ascending: false });

        if (type) query = query.eq("type", type);

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Shape the data — join read state per user
        const notifications = (data || []).map((event) => {
            const readRecord = event.notification_reads?.find(
                (r: { recipient_id: string }) => r.recipient_id === user.id,
            );
            return {
                ...event,
                isRead: readRecord?.is_read ?? false,
                readAt: readRecord?.read_at ?? null,
                notification_reads: undefined,
            };
        });

        // Apply isRead filter after join (since read state is per-user)
        const filtered =
            isRead !== null && isRead !== undefined
                ? notifications.filter((n) => n.isRead === (isRead === "true"))
                : notifications;

        const unreadCount = notifications.filter((n) => !n.isRead).length;

        const camelData = toCamelKeys(filtered);

        const parsed = NotificationListResponse.safeParse({
            notifications: camelData,
            unreadCount,
        });

        if (!parsed.success) {
            console.error(
                "Notifications response validation failed:",
                parsed.error,
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/notifications (internal — cron + server triggers only)
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateNotificationInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const {
            tenantId,
            type,
            title,
            body: bodyText,
            metadata,
            targetRole,
            recipientId,
        } = result.data;

        // Ensure tenant matches session tenant
        if (tenantId !== currentTenantId) {
            return NextResponse.json(
                { error: "Tenant mismatch" },
                { status: 403 },
            );
        }

        const payload = toSnakeKeys({
            tenantId,
            type,
            title,
            body: bodyText,
            metadata: metadata ?? null,
            targetRole: targetRole ?? null,
            recipientId: recipientId ?? null,
        });

        const { error } = await supabase
            .from("notification_events")
            .insert(payload);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
