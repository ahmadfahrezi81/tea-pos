import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayrollPeriodInput, PayrollPeriodResponse } from "@tea-pos/features/payroll/schema";
import { updatePayrollPeriod } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { isFlagEnabled, FLAGS } from "@/lib/flags";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const payrollEnabled = await isFlagEnabled(FLAGS.FEATURE.PAYROLL, user.id, { role: user.role, tenantId });
        if (!payrollEnabled) return forbidden("Payroll is not available");

        const { id } = await params;
        const body = UpdatePayrollPeriodInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const period = await updatePayrollPeriod(supabase, { tenantId, userId: user.id, id, status: body.data.status });

        const parsed = PayrollPeriodResponse.safeParse(period);
        if (!parsed.success) return ok(period);

        return ok(parsed.data);
    } catch (error) { return handleError("PATCH /api/payroll/periods/[id]", error); }
}
