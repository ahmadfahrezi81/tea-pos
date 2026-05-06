import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { ProductSalesQuery, ProductSalesResponse } from "@tea-pos/features/analytics/schema";
import { getProductSales } from "@tea-pos/services/analytics";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const sp = request.nextUrl.searchParams;
        const query = ProductSalesQuery.safeParse({ storeId: sp.get("storeId"), month: sp.get("month") });
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const result = await getProductSales(supabase, { tenantId, ...query.data });
        const parsed = ProductSalesResponse.safeParse(result);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
