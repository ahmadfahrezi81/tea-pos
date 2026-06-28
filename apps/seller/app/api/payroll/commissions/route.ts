import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayrollCommissionsQuery, PayrollCommissionListResponse } from "@tea-pos/features/payroll/schema";
import { listPayrollCommissions } from "@tea-pos/services/payroll";
import { ok, badRequest, forbidden, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayrollCommissionsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        if (user.role !== "ADMIN" && query.data.userId && query.data.userId !== user.id) {
            return forbidden("You can only view your own payroll commissions");
        }

        const commissions = await listPayrollCommissions(supabase, { tenantId, ...query.data });

        const parsed = PayrollCommissionListResponse.safeParse({ commissions });
        return ok(parsed.success ? parsed.data : { commissions });
    } catch (error) {
        return handleError("GET /api/payroll/commissions", error);
    }
}
