import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayrollCommissionsQuery, PayrollCommissionListResponse } from "@tea-pos/features/payroll/schema";
import { listPayrollCommissions } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayrollCommissionsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const commissions = await listPayrollCommissions(supabase, { tenantId, ...query.data });

        const parsed = PayrollCommissionListResponse.safeParse({ commissions });
        return ok(parsed.success ? parsed.data : { commissions });
    } catch (error) {
        return handleError("GET /api/payroll/commissions", error);
    }
}
