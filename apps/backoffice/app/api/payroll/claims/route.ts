import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListAllPayrollClaimsQuery, PayrollClaimListResponse } from "@tea-pos/features/payroll-claims/schema";
import { listAllPayrollClaims } from "@tea-pos/services/payroll-claims";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListAllPayrollClaimsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const claims = await listAllPayrollClaims(supabase, { tenantId, ...query.data });
        const parsed = PayrollClaimListResponse.safeParse({ claims });
        return ok(parsed.success ? parsed.data : { claims });
    } catch (error) {
        return handleError("GET /api/payroll/claims", error);
    }
}
