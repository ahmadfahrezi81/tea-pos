import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetPayslipQuery, PayslipResponse } from "@tea-pos/features/payroll/schema";
import { getPayslip } from "@tea-pos/services/payroll";
import { ok, err, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetPayslipQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const payslip = await getPayslip(supabase, {
            tenantId,
            userId: user.id,
            payoutId: query.data.payoutId,
        });
        const parsed = PayslipResponse.safeParse(payslip);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/payroll/payslip", error);
    }
}
