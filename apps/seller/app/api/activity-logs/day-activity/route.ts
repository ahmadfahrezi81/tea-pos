import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListActivityLogsQuery } from "@tea-pos/features/activity-logs/schema";
import { getDayActivity } from "@tea-pos/services/activity-logs";
import { ok, badRequest, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListActivityLogsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const segments = await getDayActivity(supabase, { tenantId, ...query.data });
        return ok(segments);
    } catch (error) {
        return handleError("GET /api/activity-logs/day-activity", error);
    }
}
