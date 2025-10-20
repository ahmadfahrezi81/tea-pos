// app/api/analytics/admin/store-breakdown/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import {
    AdminDateRangeQuery,
    AdminStoreBreakdownResponse,
} from "@/lib/schemas/analytics";

// ============================================================================
// HELPER: Fetch all orders with pagination
// ============================================================================
async function fetchAllOrders(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    tenantId: string,
    startDate: string,
    endDate: string,
    storeIds?: string[]
) {
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allOrders: any[] = [];

    while (true) {
        let query = supabase
            .from("orders")
            .select(
                `
                id,
                store_id,
                stores!inner(name)
            `
            )
            .eq("tenant_id", tenantId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .range(from, to);

        if (storeIds && storeIds.length > 0) {
            query = query.in("store_id", storeIds);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data || data.length === 0) break;

        allOrders = allOrders.concat(data);

        // Break if we got less than pageSize (last page)
        if (data.length < pageSize) break;

        from += pageSize;
        to += pageSize;
    }

    return allOrders;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        // Validate query parameters
        const queryResult = AdminDateRangeQuery.safeParse(
            Object.fromEntries(searchParams)
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { dateFrom, dateTo } = queryResult.data;

        // Parse optional storeIds (comma-separated)
        const storeIdsParam = searchParams.get("storeIds") ?? "";
        const storeIds =
            storeIdsParam.trim().length > 0
                ? storeIdsParam.split(",").map((s) => s.trim())
                : undefined;

        // Build date range with timezone
        const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);
        const start = new Date(
            `${dateFrom}T00:00:00+${String(TIMEZONE_OFFSET).padStart(
                2,
                "0"
            )}:00`
        ).toISOString();
        const end = new Date(
            `${dateTo}T23:59:59+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`
        ).toISOString();

        // Fetch orders grouped by store with pagination (optionally filtered)
        const orders = await fetchAllOrders(
            supabase,
            currentTenantId,
            start,
            end,
            storeIds
        );

        // Aggregate by store
        const storeData: Record<
            string,
            { storeId: string; storeName: string; orders: number }
        > = {};

        for (const order of orders || []) {
            const storeId = order.store_id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const storeName = (order.stores as any)?.name || "Unknown Store";

            if (!storeData[storeId]) {
                storeData[storeId] = {
                    storeId,
                    storeName,
                    orders: 0,
                };
            }

            storeData[storeId].orders += 1;
        }

        // Calculate total and percentages
        const totalOrders = orders?.length || 0;

        const breakdownData = Object.values(storeData)
            .map((store) => ({
                storeId: store.storeId,
                storeName: store.storeName,
                orders: store.orders,
                percentage:
                    totalOrders > 0
                        ? Number(
                              ((store.orders / totalOrders) * 100).toFixed(1)
                          )
                        : 0,
            }))
            .sort((a, b) => b.orders - a.orders); // Sort by orders descending

        // Validate response
        const parsed = AdminStoreBreakdownResponse.safeParse({
            data: breakdownData,
            totalOrders,
        });

        if (!parsed.success) {
            console.error(
                "AdminStoreBreakdownResponse validation failed:",
                parsed.error
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data, { status: 200 });
    } catch (error) {
        console.error("Admin store breakdown error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
