import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { CreateNotificationInput, NotificationListResponse } from "@tea-pos/features/notifications/schema";
import { listNotifications, createNotification } from "@tea-pos/services/notifications";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const sp = new URL(request.url).searchParams;
        const result = await listNotifications(supabase, {
            tenantId,
            userId: user.id,
            userRole: user.role,
            isRead: sp.get("isRead") ?? undefined,
            type: sp.get("type") ?? undefined,
        });

        const parsed = NotificationListResponse.safeParse(result);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/notifications", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateNotificationInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        if (body.data.tenantId !== tenantId) return err("Tenant mismatch", 403);

        const result = await createNotification(supabase, body.data);
        if (!result.success) return err(result.error ?? "Failed to create notification", 400);

        return ok({ success: true }, 201);
    } catch (error) {
        return handleError("POST /api/notifications", error);
    }
}
