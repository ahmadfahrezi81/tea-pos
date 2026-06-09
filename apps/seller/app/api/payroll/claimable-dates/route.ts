import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetClaimableDatesQuery, ClaimableDatesResponse } from "@tea-pos/features/payroll-claims/schema";
import { getClaimableDates } from "@tea-pos/services/payroll-claims";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetClaimableDatesQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const dates = await getClaimableDates(supabase, {
            tenantId,
            userId: user.id,
            periodId: query.data.periodId,
        });

        const parsed = ClaimableDatesResponse.safeParse({ dates });
        return ok(parsed.success ? parsed.data : { dates });
    } catch (error) {
        return handleError("GET /api/payroll/claimable-dates", error);
    }
}
