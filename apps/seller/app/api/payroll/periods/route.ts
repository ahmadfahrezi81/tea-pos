import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayrollPeriodsQuery, PayrollPeriodListResponse } from "@tea-pos/features/payroll/schema";
import { listPayrollPeriods } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayrollPeriodsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const periods = await listPayrollPeriods(supabase, { tenantId });

        const parsed = PayrollPeriodListResponse.safeParse({ periods });
        if (!parsed.success) return ok({ periods });

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/payroll/periods", error); }
}
