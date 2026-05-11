import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { HourlySalesQuery, HourlySalesResponse } from "@tea-pos/features/analytics/schema";
import { getHourlySales } from "@tea-pos/services/analytics";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = HourlySalesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await getHourlySales(supabase, { tenantId, ...query.data });
        const parsed = HourlySalesResponse.safeParse({ data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/analytics/hourly-sales", error);
    }
}
