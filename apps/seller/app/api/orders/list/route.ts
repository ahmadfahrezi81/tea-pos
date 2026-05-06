import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListAllOrdersQuery,
    AllOrdersListResponse,
} from "@tea-pos/features/orders/order-list-schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListAllOrdersQuery.safeParse(Object.fromEntries(searchParams));
        if (!queryResult.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: queryResult.error.format() },
                { status: 400 },
            );
        }

        const { storeIds, date, productIds } = queryResult.data;

        const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);
        const start = new Date(`${date}T00:00:00+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`).toISOString();
        const end = new Date(`${date}T23:59:59+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`).toISOString();

        let query = supabase
            .from("orders")
            .select(`
                id,
                store_id,
                user_id,
                total_amount,
                created_at,
                tenant_id,
                stores!inner(name),
                profiles!inner(full_name),
                order_items!inner(
                    id,
                    product_id,
                    quantity,
                    unit_price,
                    total_price,
                    products(name)
                )
            `)
            .eq("tenant_id", currentTenantId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: false });

        if (storeIds && storeIds.length > 0) {
            query = query.in("store_id", storeIds);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let filteredData = (data || []) as any[];
        if (productIds && productIds.length > 0) {
            filteredData = filteredData.filter((order) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                order.order_items?.some((item: any) => productIds.includes(item.product_id)),
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedData = filteredData.map((order: any) => {
            const totalQuantity =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                order.order_items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
            return {
                id: order.id,
                store_id: order.store_id,
                user_id: order.user_id,
                total_amount: order.total_amount,
                created_at: order.created_at,
                tenant_id: order.tenant_id,
                seller: order.profiles ? { full_name: order.profiles.full_name } : null,
                store: order.stores ? { name: order.stores.name } : null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                items: order.order_items?.map((item: any) => ({
                    id: item.id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price,
                    product: item.products ? { name: item.products.name } : null,
                })) || [],
                total_quantity: totalQuantity,
            };
        });

        const camelData = toCamelKeys(transformedData);
        const parsed = AllOrdersListResponse.safeParse({ orders: camelData });
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid response shape", details: parsed.error.format() },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Orders list GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
