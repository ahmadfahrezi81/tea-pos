import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreatePayrollClaimInput,
    ListPayrollClaimsQuery,
    ListAllPayrollClaimsQuery,
    PayrollClaimListResponse,
    PayrollClaimResponse,
} from "@tea-pos/features/payroll-claims/schema";
import { createPayrollClaim, listMyPayrollClaims, listAllPayrollClaims } from "@tea-pos/services/payroll-claims";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const searchParams = Object.fromEntries(new URL(request.url).searchParams);

        if (user.role === "ADMIN" && searchParams.all === "true") {
            const allQuery = ListAllPayrollClaimsQuery.safeParse(searchParams);
            if (!allQuery.success) return badRequest("Invalid query parameters");
            const claims = await listAllPayrollClaims(supabase, { tenantId, ...allQuery.data });
            const parsed = PayrollClaimListResponse.safeParse({ claims });
            return ok(parsed.success ? parsed.data : { claims });
        }

        const query = ListPayrollClaimsQuery.safeParse(searchParams);
        if (!query.success) return badRequest("Invalid query parameters");

        const claims = await listMyPayrollClaims(supabase, { tenantId, userId: user.id, ...query.data });
        const parsed = PayrollClaimListResponse.safeParse({ claims });
        return ok(parsed.success ? parsed.data : { claims });
    } catch (error) {
        return handleError("GET /api/payroll/claims", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreatePayrollClaimInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const claim = await createPayrollClaim(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });

        const parsed = PayrollClaimResponse.safeParse(claim);
        return ok(parsed.success ? parsed.data : claim);
    } catch (error) {
        return handleError("POST /api/payroll/claims", error);
    }
}
