import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import { getSummaryBreakdown } from "@tea-pos/services/summaries";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const summaryId = new URL(request.url).searchParams.get("summaryId");
        if (!summaryId) return NextResponse.json({ error: "summaryId is required" }, { status: 400 });

        const data = await getSummaryBreakdown(supabase, { tenantId, summaryId });
        return NextResponse.json(data);
    } catch (error) {
        const status = (error as { status?: number }).status ?? 500;
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
    }
}
