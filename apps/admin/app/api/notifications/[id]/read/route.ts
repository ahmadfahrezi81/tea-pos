// app/api/notifications/[id]/read/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { MarkOneReadResponse } from "@/lib/shared/schemas/notifications";

// ============================================================================
// PATCH /api/notifications/[id]/read
// ============================================================================
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createRouteHandlerClient();
        const { id } = await params;

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

        const readAt = new Date().toISOString();

        // Upsert — create the read record if it doesn't exist yet (lazy creation)
        const { error } = await supabase.from("notification_reads").upsert(
            {
                event_id: id,
                recipient_id: user.id,
                is_read: true,
                read_at: readAt,
            },
            { onConflict: "event_id,recipient_id" },
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const parsed = MarkOneReadResponse.safeParse({
            success: true,
            notificationEventId: id,
            readAt,
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
