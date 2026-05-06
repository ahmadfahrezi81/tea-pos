import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { HourlySalesQuery, HourlySalesResponse } from "@tea-pos/features/analytics/schema";
import { getHourlySales } from "@tea-pos/services/analytics";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const query = HourlySalesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const data = await getHourlySales(supabase, { tenantId, ...query.data });
        const parsed = HourlySalesResponse.safeParse({ data });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
