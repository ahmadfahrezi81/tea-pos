// app/api/orders/list/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListAllOrdersQuery,
    AllOrdersListResponse,
} from "@/lib/shared/schemas/order-list";
import { toCamelKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// GET /api/orders/list
// List orders with multi-store and product filtering support
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        // Parse and validate query parameters
        const queryResult = ListAllOrdersQuery.safeParse(
            Object.fromEntries(searchParams),
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 },
            );
        }

        const { storeIds, date, productIds } = queryResult.data;

        // Build base query
        let query = supabase
            .from("orders")
            .select(
                `
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
            `,
            )
            .eq("tenant_id", currentTenantId)
            .order("created_at", { ascending: false });

        // Filter by store IDs if provided
        if (storeIds && storeIds.length > 0) {
            query = query.in("store_id", storeIds);
        }

        // Filter by date (required parameter)
        const start = new Date(`${date}T00:00:00+07:00`).toISOString();
        const end = new Date(`${date}T23:59:59+07:00`).toISOString();
        query = query.gte("created_at", start).lte("created_at", end);

        // Execute query
        const { data, error } = await query;
        if (error) {
            console.error("Database error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Filter by product IDs if provided (post-processing since we need to check order_items)
        let filteredData = data || [];
        if (productIds && productIds.length > 0) {
            filteredData = filteredData.filter((order) =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                order.order_items?.some((item: any) =>
                    productIds.includes(item.product_id),
                ),
            );
        }

        // Transform data to match response schema
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transformedData = filteredData.map((order: any) => {
            const totalQuantity =
                order.order_items?.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, item: any) => sum + (item.quantity || 0),
                    0,
                ) || 0;

            return {
                id: order.id,
                store_id: order.store_id,
                user_id: order.user_id,
                total_amount: order.total_amount,
                created_at: order.created_at,
                tenant_id: order.tenant_id,
                seller: order.profiles
                    ? { full_name: order.profiles.full_name }
                    : null,
                store: order.stores ? { name: order.stores.name } : null,
                items:
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    order.order_items?.map((item: any) => ({
                        id: item.id,
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        total_price: item.total_price,
                        product: item.products
                            ? { name: item.products.name }
                            : null,
                    })) || [],
                total_quantity: totalQuantity,
            };
        });

        // Convert to camelCase
        const camelData = toCamelKeys(transformedData);

        // Validate response
        const parsed = AllOrdersListResponse.safeParse({ orders: camelData });
        if (!parsed.success) {
            console.error("Response validation failed:", parsed.error);
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Internal server error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
