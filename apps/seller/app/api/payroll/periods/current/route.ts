import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getOrCreatePayrollPeriod } from "@tea-pos/services/payroll";
import { PayrollPeriodResponse } from "@tea-pos/features/payroll/schema";
import { ok, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
        const localToday = new Date(Date.now() + tzOffset * 60 * 60 * 1000).toISOString().slice(0, 10);

        const raw = await getOrCreatePayrollPeriod(supabase, { tenantId, date: localToday });
        const period = toCamelKeys(raw);

        const parsed = PayrollPeriodResponse.safeParse(period);
        return ok({ period: parsed.success ? parsed.data : period });
    } catch (error) {
        return handleError("GET /api/payroll/periods/current", error);
    }
}
