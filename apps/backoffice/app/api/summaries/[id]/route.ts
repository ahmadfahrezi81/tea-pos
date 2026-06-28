import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { DailySummaryResponse } from "@tea-pos/features/summaries/schema";
import { getSummaryById } from "@tea-pos/services/summaries";
import { ok, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const { id } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const summary = await getSummaryById(supabase, { tenantId, summaryId: id });
        const parsed = DailySummaryResponse.safeParse(summary);
        return ok(parsed.success ? parsed.data : summary);
    } catch (error) {
        return handleError("GET /api/summaries/[id]", error);
    }
}
