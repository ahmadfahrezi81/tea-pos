import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreatePayrollCommissionTypeInput,
    PayrollCommissionTypeListResponse,
    PayrollCommissionTypeResponse,
} from "@tea-pos/features/payroll-commission-types/schema";
import { listPayrollCommissionTypes, createPayrollCommissionType } from "@tea-pos/services/payroll-commission-types";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const types = await listPayrollCommissionTypes(supabase, { tenantId });
        const parsed = PayrollCommissionTypeListResponse.safeParse({ commissionTypes: types });
        return ok(parsed.success ? parsed.data : { commissionTypes: types });
    } catch (error) { return handleError("GET /api/payroll/commission-types", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreatePayrollCommissionTypeInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const type = await createPayrollCommissionType(supabase, { tenantId, ...body.data });
        const parsed = PayrollCommissionTypeResponse.safeParse(type);
        return ok(parsed.success ? parsed.data : type, 201);
    } catch (error) { return handleError("POST /api/payroll/commission-types", error); }
}
