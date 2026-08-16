import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { listTenantSessionDates } from "@tea-pos/services/sessions";
import {
    TenantSessionActivityQuery,
    TenantSessionActivityResponse,
} from "@tea-pos/features/sessions/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

/**
 * The days any active store opened, for the dashboard streak grid. A list of
 * dates and nothing else — the grid draws the calendar itself.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const query = TenantSessionActivityQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const dates = await listTenantSessionDates(getServiceClient(), {
            tenantId: await getCurrentTenantId(),
            weeks: query.data.weeks,
        });

        const parsed = TenantSessionActivityResponse.safeParse({ dates });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/dashboard/work-days", error);
    }
}
