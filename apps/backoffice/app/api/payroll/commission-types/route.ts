import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreatePayrollCommissionConfigInput,
    PayrollCommissionConfigListResponse,
    PayrollCommissionConfigResponse,
} from "@tea-pos/features/payroll-commission-configs/schema";
import { listPayrollCommissionConfigs, createPayrollCommissionConfig } from "@tea-pos/services/payroll-commission-configs";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const types = await listPayrollCommissionConfigs(supabase, { tenantId });
        const parsed = PayrollCommissionConfigListResponse.safeParse({ commissionTypes: types });
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

        const body = CreatePayrollCommissionConfigInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const type = await createPayrollCommissionConfig(supabase, { tenantId, ...body.data });
        const parsed = PayrollCommissionConfigResponse.safeParse(type);
        return ok(parsed.success ? parsed.data : type, 201);
    } catch (error) { return handleError("POST /api/payroll/commission-types", error); }
}
