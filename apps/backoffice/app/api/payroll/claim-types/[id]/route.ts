import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayrollClaimTypeInput, PayrollClaimTypeResponse } from "@tea-pos/features/payroll-claim-types/schema";
import { updatePayrollClaimType } from "@tea-pos/services/payroll-claim-types";
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

        const body = UpdatePayrollClaimTypeInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const type = await updatePayrollClaimType(supabase, { tenantId, id, ...body.data });
        const parsed = PayrollClaimTypeResponse.safeParse(type);
        return ok(parsed.success ? parsed.data : type);
    } catch (error) { return handleError("PATCH /api/payroll/claim-types/[id]", error); }
}
