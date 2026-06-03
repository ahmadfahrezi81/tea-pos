import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdateReimbursementStatusInput } from "@tea-pos/features/reimbursements/schema";
import { updateReimbursementStatus } from "@tea-pos/services/reimbursements";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const { id } = await params;
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = UpdateReimbursementStatusInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const result = await updateReimbursementStatus(supabase, { id, tenantId, actorId: user.id, status: body.data.status });
        return ok(result);
    } catch (error) { return handleError("PATCH /api/reimbursements/[id]", error); }
}
