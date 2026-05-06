import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import { CreateNotificationInput, NotificationListResponse } from "@tea-pos/features/notifications/schema";
import { listNotifications, createNotification } from "@tea-pos/services/notifications";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile, error: profileError } = await supabase
            .from("profiles").select("role").eq("id", user.id).single();
        if (profileError || !profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

        const sp = new URL(request.url).searchParams;
        const result = await listNotifications(supabase, {
            tenantId,
            userId: user.id,
            userRole: profile.role,
            isRead: sp.get("isRead") ?? undefined,
            type: sp.get("type") ?? undefined,
        });

        const parsed = NotificationListResponse.safeParse(result);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateNotificationInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        if (body.data.tenantId !== tenantId) return NextResponse.json({ error: "Tenant mismatch" }, { status: 403 });

        const result = await createNotification(supabase, body.data);
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
