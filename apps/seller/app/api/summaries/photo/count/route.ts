import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { getSummaryPhotoCount } from "@tea-pos/services/summaries";
import { ok, badRequest, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const dailySummaryId = new URL(request.url).searchParams.get("dailySummaryId");
        if (!dailySummaryId) return badRequest("dailySummaryId is required");

        const count = await getSummaryPhotoCount(supabase, { tenantId, dailySummaryId });
        return ok({ count });
    } catch (error) {
        return handleError("GET /api/summaries/photo/count", error);
    }
}
