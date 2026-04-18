// app/api/notifications/read-all/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import { MarkAllReadResponse } from "@/lib/shared/schemas/notifications";

// ============================================================================
// PATCH /api/notifications/read-all
// ============================================================================
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

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

        const readAt = new Date().toISOString();

        // Fetch all unread notification events visible to this user
        const { data: events, error: eventsError } = await supabase
            .from("notification_events")
            .select("id")
            .eq("tenant_id", currentTenantId)
            .or(
                `target_role.eq.${profile.role},recipient_id.eq.${user.id},and(target_role.is.null,recipient_id.is.null)`,
            );

        if (eventsError) {
            return NextResponse.json(
                { error: eventsError.message },
                { status: 400 },
            );
        }

        if (!events || events.length === 0) {
            const parsed = MarkAllReadResponse.safeParse({
                success: true,
                updatedCount: 0,
            });
            return NextResponse.json(parsed.data);
        }

        const eventIds = events.map((e) => e.id);

        // Upsert read records for all events — lazy creation pattern
        const upsertPayload = eventIds.map((eventId) => ({
            event_id: eventId,
            recipient_id: user.id,
            is_read: true,
            read_at: readAt,
        }));

        const { error: upsertError } = await supabase
            .from("notification_reads")
            .upsert(upsertPayload, { onConflict: "event_id,recipient_id" });

        if (upsertError) {
            return NextResponse.json(
                { error: upsertError.message },
                { status: 400 },
            );
        }

        const parsed = MarkAllReadResponse.safeParse({
            success: true,
            updatedCount: eventIds.length,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid response shape" },
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
