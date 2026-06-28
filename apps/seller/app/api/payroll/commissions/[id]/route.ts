import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayrollCommissionInput, PayrollCommissionResponse } from "@tea-pos/features/payroll/schema";
import { updatePayrollCommission } from "@tea-pos/services/payroll";
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
        const body = UpdatePayrollCommissionInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const commission = await updatePayrollCommission(supabase, {
            tenantId,
            userId: user.id,
            id,
            status: body.data.status,
        });

        const parsed = PayrollCommissionResponse.safeParse(commission);
        return ok(parsed.success ? parsed.data : commission);
    } catch (error) {
        return handleError("PATCH /api/payroll/commissions/[id]", error);
    }
}
