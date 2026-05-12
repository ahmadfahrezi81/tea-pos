import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    ListOrdersQuery,
    OrderListResponse,
    CreateOrderInput,
    CreateOrderResponse,
} from "@tea-pos/features/orders/schema";
import { listOrders, createOrder } from "@tea-pos/services/orders";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListOrdersQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listOrders(supabase, { tenantId, ...query.data });
        const parsed = OrderListResponse.safeParse({ orders: data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/orders", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreateOrderInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const result = await createOrder(supabase, { tenantId, userId: user.id, ...body.data });
        const parsed = CreateOrderResponse.safeParse({ success: true, ...result });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) {
        return handleError("POST /api/orders", error);
    }
}
