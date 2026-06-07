import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetDayActivityQuery } from "@tea-pos/features/activity-logs/schema";
import { getDayActivity } from "@tea-pos/services/activity-logs";
import { ok, badRequest, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = GetDayActivityQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const result = await getDayActivity(supabase, { tenantId, summaryId: query.data.summaryId });
        return ok(result);
    } catch (error) {
        return handleError("GET /api/activity-logs/day-activity", error);
    }
}
