import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { DailySalesQuery, DailySalesResponse } from "@tea-pos/features/analytics/schema";
import { getDailySales } from "@tea-pos/services/analytics";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const sp = request.nextUrl.searchParams;
        const query = DailySalesQuery.safeParse({ storeId: sp.get("storeId"), month: sp.get("month") });
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const data = await getDailySales(supabase, { tenantId, ...query.data });
        const parsed = DailySalesResponse.safeParse({ data });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
