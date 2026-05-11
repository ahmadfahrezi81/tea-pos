import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { DayOfWeekSalesQuery, DayOfWeekSalesResponse } from "@tea-pos/features/analytics/schema";
import { getDayOfWeekSales } from "@tea-pos/services/analytics";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const sp = request.nextUrl.searchParams;
        const query = DayOfWeekSalesQuery.safeParse({ storeId: sp.get("storeId"), month: sp.get("month") });
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await getDayOfWeekSales(supabase, { tenantId, ...query.data });
        const parsed = DayOfWeekSalesResponse.safeParse({ data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/analytics/day-of-week-sales", error);
    }
}
