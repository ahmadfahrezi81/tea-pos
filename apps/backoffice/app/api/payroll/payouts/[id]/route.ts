import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayoutInput } from "@tea-pos/features/payroll/schema";
import { updatePayoutStatus } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const { id } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = UpdatePayoutInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const result = await updatePayoutStatus(supabase, {
            id, tenantId, actorId: user.id,
            status: body.data.status,
            paymentProofUrl: body.data.paymentProofUrl,
        });
        return ok(result);
    } catch (error) { return handleError("PATCH /api/payroll/payouts/[id]", error); }
}
