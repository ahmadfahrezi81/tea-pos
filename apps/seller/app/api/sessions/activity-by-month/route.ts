import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { listUserSessionDatesByMonth } from "@tea-pos/services/sessions";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { GetUserSessionActivityQuery, UserSessionActivityResponse } from "@tea-pos/features/sessions/schema";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const query = GetUserSessionActivityQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const dates = await listUserSessionDatesByMonth(supabase, {
            tenantId,
            userId: user.id,
            month: query.data.month,
        });

        return ok(UserSessionActivityResponse.parse({ dates }));
    } catch (error) {
        return handleError("GET /api/sessions/activity-by-month", error);
    }
}
