import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayrollCommissionConfigInput, PayrollCommissionConfigResponse } from "@tea-pos/features/payroll-commission-configs/schema";
import { updatePayrollCommissionConfig } from "@tea-pos/services/payroll-commission-configs";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const { id } = await params;

        const body = UpdatePayrollCommissionConfigInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const type = await updatePayrollCommissionConfig(supabase, { tenantId, id, ...body.data });
        const parsed = PayrollCommissionConfigResponse.safeParse(type);
        return ok(parsed.success ? parsed.data : type);
    } catch (error) { return handleError("PATCH /api/payroll/commission-types/[id]", error); }
}
