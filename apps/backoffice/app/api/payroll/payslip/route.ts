import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetPayslipQuery } from "@tea-pos/features/payroll/schema";
import { getPayslip } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetPayslipQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const payslip = await getPayslip(supabase, { tenantId, userId: query.data.userId, payoutId: query.data.payoutId });
        return ok(payslip);
    } catch (error) { return handleError("GET /api/payroll/payslip", error); }
}
