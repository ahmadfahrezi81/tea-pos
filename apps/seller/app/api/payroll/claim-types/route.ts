import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetClaimableTypesQuery, ClaimableTypesResponse } from "@tea-pos/features/payroll-claims/schema";
import { getClaimableTypes } from "@tea-pos/services/payroll-claims";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetClaimableTypesQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const types = await getClaimableTypes(supabase, {
            tenantId,
            userId: user.id,
            periodId: query.data.periodId,
        });

        const parsed = ClaimableTypesResponse.safeParse({ types });
        return ok(parsed.success ? parsed.data : { types });
    } catch (error) {
        return handleError("GET /api/payroll/claim-types", error);
    }
}
