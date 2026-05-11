import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { getSummaryBreakdown } from "@tea-pos/services/summaries";
import { ok, badRequest, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const summaryId = new URL(request.url).searchParams.get("summaryId");
        if (!summaryId) return badRequest("summaryId is required");

        const data = await getSummaryBreakdown(supabase, { tenantId, summaryId });
        return ok(data);
    } catch (error) {
        return handleError("GET /api/summaries/breakdown", error);
    }
}
