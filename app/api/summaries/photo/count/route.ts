import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const dailySummaryId = searchParams.get("dailySummaryId");

        if (!dailySummaryId) {
            return NextResponse.json(
                { error: "dailySummaryId is required" },
                { status: 400 },
            );
        }

        const { count, error } = await supabase
            .from("daily_summary_photos")
            .select("*", { count: "exact", head: true })
            .eq("tenant_id", currentTenantId)
            .eq("daily_summary_id", dailySummaryId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ count: count ?? 0 });
    } catch (error) {
        console.error("[GET /api/summaries/photo/count]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
