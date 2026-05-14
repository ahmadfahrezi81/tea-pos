import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdatePayrollEntryInput, PayrollEntryResponse } from "@tea-pos/features/payroll/schema";
import { updatePayrollEntry } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
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
        const { id } = await params;
        const body = UpdatePayrollEntryInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const entry = await updatePayrollEntry(supabase, { tenantId, userId: user.id, id, status: body.data.status });

        const parsed = PayrollEntryResponse.safeParse(entry);
        if (!parsed.success) return ok(entry);

        return ok(parsed.data);
    } catch (error) { return handleError("PATCH /api/payroll/entries/[id]", error); }
}
