// // app/api/analytics/admin/metrics/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { getCurrentTenantId } from "@/lib/tenant";
// import {
//     AdminDateRangeQuery,
//     AdminMetricsResponse,
// } from "@/lib/schemas/analytics";

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const { searchParams } = new URL(request.url);

//         // Validate query parameters
//         const queryResult = AdminDateRangeQuery.safeParse(
//             Object.fromEntries(searchParams)
//         );
//         if (!queryResult.success) {
//             return NextResponse.json(
//                 {
//                     error: "Invalid query parameters",
//                     details: queryResult.error.format(),
//                 },
//                 { status: 400 }
//             );
//         }

//         const { dateFrom, dateTo } = queryResult.data;

//         // Build date range with timezone
//         const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);
//         const currentStart = new Date(
//             `${dateFrom}T00:00:00+${String(TIMEZONE_OFFSET).padStart(
//                 2,
//                 "0"
//             )}:00`
//         ).toISOString();
//         const currentEnd = new Date(
//             `${dateTo}T23:59:59+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`
//         ).toISOString();

//         // Calculate previous period dates
//         const currentDate = new Date(dateFrom);
//         const endDate = new Date(dateTo);
//         const daysDiff = Math.ceil(
//             (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
//         );

//         const previousStart = new Date(currentDate);
//         previousStart.setDate(previousStart.getDate() - daysDiff - 1);
//         const previousEnd = new Date(currentDate);
//         previousEnd.setDate(previousEnd.getDate() - 1);

//         const prevStart = new Date(
//             `${previousStart.toISOString().split("T")[0]}T00:00:00+${String(
//                 TIMEZONE_OFFSET
//             ).padStart(2, "0")}:00`
//         ).toISOString();
//         const prevEnd = new Date(
//             `${previousEnd.toISOString().split("T")[0]}T23:59:59+${String(
//                 TIMEZONE_OFFSET
//             ).padStart(2, "0")}:00`
//         ).toISOString();

//         // Fetch current period data
//         const { data: currentOrders, error: currentError } = await supabase
//             .from("orders")
//             .select(
//                 `
//                 id,
//                 total_amount,
//                 order_items(quantity)
//             `
//             )
//             .eq("tenant_id", currentTenantId)
//             .gte("created_at", currentStart)
//             .lte("created_at", currentEnd);

//         if (currentError) {
//             console.error("Error fetching current orders:", currentError);
//             return NextResponse.json(
//                 { error: "Failed to fetch current period data" },
//                 { status: 500 }
//             );
//         }

//         // Fetch previous period data
//         const { data: previousOrders, error: previousError } = await supabase
//             .from("orders")
//             .select(
//                 `
//                 id,
//                 total_amount,
//                 order_items(quantity)
//             `
//             )
//             .eq("tenant_id", currentTenantId)
//             .gte("created_at", prevStart)
//             .lte("created_at", prevEnd);

//         if (previousError) {
//             console.error("Error fetching previous orders:", previousError);
//             return NextResponse.json(
//                 { error: "Failed to fetch previous period data" },
//                 { status: 500 }
//             );
//         }

//         // Calculate current period metrics
//         const totalRevenue =
//             currentOrders?.reduce(
//                 (sum, order) => sum + (order.total_amount || 0),
//                 0
//             ) || 0;

//         const totalOrders = currentOrders?.length || 0;

//         const totalCups =
//             currentOrders?.reduce((sum, order) => {
//                 const orderCups =
//                     order.order_items?.reduce(
//                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                         (itemSum: number, item: any) =>
//                             itemSum + (item.quantity || 0),
//                         0
//                     ) || 0;
//                 return sum + orderCups;
//             }, 0) || 0;

//         const averageOrderValue =
//             totalOrders > 0 ? totalRevenue / totalOrders : 0;

//         // Calculate previous period metrics
//         const prevRevenue =
//             previousOrders?.reduce(
//                 (sum, order) => sum + (order.total_amount || 0),
//                 0
//             ) || 0;

//         const prevOrders = previousOrders?.length || 0;

//         const prevCups =
//             previousOrders?.reduce((sum, order) => {
//                 const orderCups =
//                     order.order_items?.reduce(
//                         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                         (itemSum: number, item: any) =>
//                             itemSum + (item.quantity || 0),
//                         0
//                     ) || 0;
//                 return sum + orderCups;
//             }, 0) || 0;

//         const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

//         // Calculate percentage changes
//         const calculateChange = (current: number, previous: number): number => {
//             if (previous === 0) return current > 0 ? 100 : 0;
//             return Number((((current - previous) / previous) * 100).toFixed(1));
//         };

//         const revenueChange = calculateChange(totalRevenue, prevRevenue);
//         const ordersChange = calculateChange(totalOrders, prevOrders);
//         const cupsChange = calculateChange(totalCups, prevCups);
//         const aovChange = calculateChange(averageOrderValue, prevAov);

//         // Validate response
//         const parsed = AdminMetricsResponse.safeParse({
//             totalRevenue,
//             totalOrders,
//             totalCups,
//             averageOrderValue: Number(averageOrderValue.toFixed(0)),
//             revenueChange,
//             ordersChange,
//             cupsChange,
//             aovChange,
//         });

//         if (!parsed.success) {
//             console.error(
//                 "AdminMetricsResponse validation failed:",
//                 parsed.error
//             );
//             return NextResponse.json(
//                 {
//                     error: "Invalid response shape",
//                     details: parsed.error.format(),
//                 },
//                 { status: 500 }
//             );
//         }

//         return NextResponse.json(parsed.data, { status: 200 });
//     } catch (error) {
//         console.error("Admin metrics error:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// app/api/analytics/admin/metrics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import {
    AdminDateRangeQuery,
    AdminMetricsResponse,
} from "@/lib/schemas/analytics";

// ============================================================================
// HELPER: Fetch all orders with pagination
// ============================================================================
async function fetchAllOrders(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    tenantId: string,
    startDate: string,
    endDate: string
) {
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allOrders: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("orders")
            .select(
                `
                id,
                total_amount,
                order_items(quantity)
            `
            )
            .eq("tenant_id", tenantId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .order("created_at", { ascending: true })
            .range(from, to);

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

        // Build date range with timezone
        const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);
        const currentStart = new Date(
            `${dateFrom}T00:00:00+${String(TIMEZONE_OFFSET).padStart(
                2,
                "0"
            )}:00`
        ).toISOString();
        const currentEnd = new Date(
            `${dateTo}T23:59:59+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`
        ).toISOString();

        // Calculate previous period dates
        const currentDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const daysDiff = Math.ceil(
            (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const previousStart = new Date(currentDate);
        previousStart.setDate(previousStart.getDate() - daysDiff - 1);
        const previousEnd = new Date(currentDate);
        previousEnd.setDate(previousEnd.getDate() - 1);

        const prevStart = new Date(
            `${previousStart.toISOString().split("T")[0]}T00:00:00+${String(
                TIMEZONE_OFFSET
            ).padStart(2, "0")}:00`
        ).toISOString();
        const prevEnd = new Date(
            `${previousEnd.toISOString().split("T")[0]}T23:59:59+${String(
                TIMEZONE_OFFSET
            ).padStart(2, "0")}:00`
        ).toISOString();

        // Fetch current period data with pagination
        const currentOrders = await fetchAllOrders(
            supabase,
            currentTenantId,
            currentStart,
            currentEnd
        );

        // Fetch previous period data with pagination
        const previousOrders = await fetchAllOrders(
            supabase,
            currentTenantId,
            prevStart,
            prevEnd
        );

        // Calculate current period metrics
        const totalRevenue =
            currentOrders?.reduce(
                (sum, order) => sum + (order.total_amount || 0),
                0
            ) || 0;

        const totalOrders = currentOrders?.length || 0;

        const totalCups =
            currentOrders?.reduce((sum, order) => {
                const orderCups =
                    order.order_items?.reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (itemSum: number, item: any) =>
                            itemSum + (item.quantity || 0),
                        0
                    ) || 0;
                return sum + orderCups;
            }, 0) || 0;

        const averageOrderValue =
            totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate previous period metrics
        const prevRevenue =
            previousOrders?.reduce(
                (sum, order) => sum + (order.total_amount || 0),
                0
            ) || 0;

        const prevOrders = previousOrders?.length || 0;

        const prevCups =
            previousOrders?.reduce((sum, order) => {
                const orderCups =
                    order.order_items?.reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (itemSum: number, item: any) =>
                            itemSum + (item.quantity || 0),
                        0
                    ) || 0;
                return sum + orderCups;
            }, 0) || 0;

        const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        const revenueChange = calculateChange(totalRevenue, prevRevenue);
        const ordersChange = calculateChange(totalOrders, prevOrders);
        const cupsChange = calculateChange(totalCups, prevCups);
        const aovChange = calculateChange(averageOrderValue, prevAov);

        // Validate response
        const parsed = AdminMetricsResponse.safeParse({
            totalRevenue,
            totalOrders,
            totalCups,
            averageOrderValue: Number(averageOrderValue.toFixed(0)),
            revenueChange,
            ordersChange,
            cupsChange,
            aovChange,
        });

        if (!parsed.success) {
            console.error(
                "AdminMetricsResponse validation failed:",
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
        console.error("Admin metrics error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
