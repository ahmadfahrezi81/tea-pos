import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { MarkOneReadResponse } from "@tea-pos/features/notifications/schema";

export async function PATCH(
    _request: NextRequest,
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const readAt = new Date().toISOString();

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
            return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Notification read PATCH error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
