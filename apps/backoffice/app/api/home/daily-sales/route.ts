import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { getActiveStoreDailyTotals } from "@tea-pos/services/summaries";
import { TenantDailyTotalsQuery, TenantDailyTotalsResponse } from "@tea-pos/features/analytics/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

/**
 * Cups, orders and takings per day across every active store, for the
 * home screen's one chart. Read-only, tenant from the cookie — this runs on the
 * service-role key, so the filter is the only isolation there is.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const query = TenantDailyTotalsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const toDate = getTodayLocalStr();
        const from = new Date(`${toDate}T00:00:00.000Z`);
        from.setUTCDate(from.getUTCDate() - (query.data.days - 1));
        const fromDate = from.toISOString().slice(0, 10);

        const points = await getActiveStoreDailyTotals(getServiceClient(), {
            tenantId: await getCurrentTenantId(),
            fromDate,
            toDate,
            storeId: query.data.storeId,
        });

        // Summed here rather than in the component: the series is already in
        // hand, and the client would only be redoing the same fold on render.
        const totals = points.reduce(
            (acc, p) => ({
                cups: acc.cups + p.cups,
                orders: acc.orders + p.orders,
                sales: acc.sales + p.sales,
            }),
            { cups: 0, orders: 0, sales: 0 },
        );

        const parsed = TenantDailyTotalsResponse.safeParse({ points, totals });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/home/daily-sales", error);
    }
}
