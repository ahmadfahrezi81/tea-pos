import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    SetClaimEligibilityInput,
    GetClaimEligibilityQuery,
    ClaimEligibilityListResponse,
} from "@tea-pos/features/payroll-claim-configs/schema";
import { listClaimEligibility, setUserClaimEligibility } from "@tea-pos/services/payroll-claim-configs";
import { ok, err, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetClaimEligibilityQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        // No `userId` means every staff member — see `listClaimEligibility`.
        const eligibility = await listClaimEligibility(supabase, {
            tenantId,
            userId: query.data.userId,
        });
        const parsed = ClaimEligibilityListResponse.safeParse({ eligibility });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/payroll/claim-types/eligibility", error); }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = SetClaimEligibilityInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        await setUserClaimEligibility(supabase, { tenantId, ...body.data });
        return ok({ ok: true });
    } catch (error) { return handleError("PUT /api/payroll/claim-types/eligibility", error); }
}
