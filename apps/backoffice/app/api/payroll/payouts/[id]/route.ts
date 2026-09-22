import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayoutInput, PayslipResponse } from "@tea-pos/features/payroll/schema";
import { updatePayoutStatus, getPayslip } from "@tea-pos/services/payroll";
import { ok, err, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const { id } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = UpdatePayoutInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        await updatePayoutStatus(supabase, {
            id, tenantId, actorId: user.id,
            status: body.data.status,
            paymentProofUrl: body.data.paymentProofUrl,
            notes: body.data.notes,
        });

        /* Answers with the payslip, not the row: it is what the client renders
           next, and it used to cost a second round trip. It also carries
           `paidByName`, which the bare row does not. */
        const payslip = await getPayslip(supabase, { tenantId, payoutId: id });
        const parsed = PayslipResponse.safeParse(payslip);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("PATCH /api/payroll/payouts/[id]", error); }
}
