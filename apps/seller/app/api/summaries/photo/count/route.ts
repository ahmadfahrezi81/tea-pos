import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import { getSummaryPhotoCount } from "@tea-pos/services/summaries";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const dailySummaryId = new URL(request.url).searchParams.get("dailySummaryId");
        if (!dailySummaryId) return NextResponse.json({ error: "dailySummaryId is required" }, { status: 400 });

        const count = await getSummaryPhotoCount(supabase, { tenantId, dailySummaryId });
        return NextResponse.json({ count });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
