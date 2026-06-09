import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreatePayrollClaimTypeInput,
    PayrollClaimTypeListResponse,
    PayrollClaimTypeResponse,
} from "@tea-pos/features/payroll-claim-types/schema";
import { listPayrollClaimTypes, createPayrollClaimType } from "@tea-pos/services/payroll-claim-types";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const types = await listPayrollClaimTypes(supabase, { tenantId });
        const parsed = PayrollClaimTypeListResponse.safeParse({ claimTypes: types });
        return ok(parsed.success ? parsed.data : { claimTypes: types });
    } catch (error) { return handleError("GET /api/payroll/claim-types", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreatePayrollClaimTypeInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const type = await createPayrollClaimType(supabase, { tenantId, ...body.data });
        const parsed = PayrollClaimTypeResponse.safeParse(type);
        return ok(parsed.success ? parsed.data : type, 201);
    } catch (error) { return handleError("POST /api/payroll/claim-types", error); }
}
