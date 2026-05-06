import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListOrdersQuery,
    OrderListResponse,
    CreateOrderInput,
    CreateOrderResponse,
} from "@tea-pos/features/orders/schema";
import { listOrders, createOrder } from "@tea-pos/services/orders";

function errResponse(error: unknown) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const query = ListOrdersQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const data = await listOrders(supabase, { tenantId, ...query.data });
        const parsed = OrderListResponse.safeParse({ orders: data });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = CreateOrderInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const result = await createOrder(supabase, { tenantId, userId: user.id, ...body.data });
        const parsed = CreateOrderResponse.safeParse({ success: true, ...result });
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) { return errResponse(error); }
}
