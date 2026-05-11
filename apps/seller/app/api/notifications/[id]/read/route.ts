import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { NextRequest } from "next/server";
import { MarkOneReadResponse } from "@tea-pos/features/notifications/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const { id } = await params;
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

        if (error) return badRequest(error.message);

        const parsed = MarkOneReadResponse.safeParse({
            success: true,
            notificationEventId: id,
            readAt,
        });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("PATCH /api/notifications/[id]/read", error);
    }
}
