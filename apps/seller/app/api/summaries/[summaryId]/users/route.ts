import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { getSummaryUsers } from "@tea-pos/services/summaries";
import { ok, handleError } from "@/lib/api/response";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ summaryId: string }> },
) {
    try {
        const { summaryId } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const users = await getSummaryUsers(supabase, { tenantId, summaryId });
        return ok({ users });
    } catch (error) {
        return handleError("GET /api/summaries/[summaryId]/users", error);
    }
}
