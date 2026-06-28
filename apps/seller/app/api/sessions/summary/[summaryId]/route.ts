import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { SessionsBySummaryResponse } from "@tea-pos/features/sessions/schema";
import { listSessionsBySummary } from "@tea-pos/services/sessions";
import { ok, handleError } from "@/lib/api/response";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ summaryId: string }> },
) {
    try {
        const { summaryId } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const result = await listSessionsBySummary(supabase, { tenantId, summaryId });
        return ok(SessionsBySummaryResponse.parse(result));
    } catch (error) {
        return handleError("GET /api/sessions/summary/[summaryId]", error);
    }
}
