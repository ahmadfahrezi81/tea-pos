import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { DailySalesQuery, DailySalesResponse } from "@/lib/schemas/analytics";
import { getCurrentTenantId } from "@/lib/tenant";

async function fetchAllOrders(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    storeId: string,
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
                created_at,
                order_items(quantity)
            `
            )
            .eq("tenant_id", tenantId)
            .eq("store_id", storeId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .order("created_at", { ascending: true })
            .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allOrders = allOrders.concat(data);
        from += pageSize;
        to += pageSize;
    }

    return allOrders;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const searchParams = request.nextUrl.searchParams;

        // ✅ Validate query parameters
        const queryValidation = DailySalesQuery.safeParse({
            storeId: searchParams.get("storeId"),
            month: searchParams.get("month"),
        });

        if (!queryValidation.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryValidation.error.format(),
                },
                { status: 400 }
            );
        }

        const { storeId, month } = queryValidation.data;

        // ✅ Parse year & month safely
        const [year, monthNum] = month.split("-");
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(monthNum, 10);

        // ✅ Calculate first and last day of month
        const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
        const endDate = new Date(
            Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59)
        );

        // ✅ Timezone offset in hours (default UTC+7)
        const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);

        // ✅ Fetch orders in pages
        const orders = await fetchAllOrders(
            supabase,
            storeId,
            currentTenantId,
            startDate.toISOString(),
            endDate.toISOString()
        );

        // ✅ Aggregate orders by *local date*
        const dailyData: Record<string, number> = {};

        for (const order of orders) {
            if (!order.created_at) continue;

            // Convert UTC → local time using timezone offset
            const utcDate = new Date(order.created_at);
            const localTime = new Date(
                utcDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000
            );

            const dateKey = localTime.toISOString().split("T")[0]; // YYYY-MM-DD (local)

            if (!dailyData[dateKey]) dailyData[dateKey] = 0;

            const totalCups =
                order.order_items?.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, item: any) => sum + (item.quantity || 0),
                    0
                ) ?? 0;

            dailyData[dateKey] += totalCups;
        }

        // ✅ Convert to chart-friendly array
        const chartData = Object.entries(dailyData)
            .map(([date, cups]) => ({ date, cups }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // ✅ Validate with Zod response schema
        const parsedResponse = DailySalesResponse.safeParse({
            data: chartData,
        });

        if (!parsedResponse.success) {
            console.error(
                "DailySalesResponse validation failed:",
                parsedResponse.error
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsedResponse.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsedResponse.data, { status: 200 });
    } catch (error) {
        console.error("Daily sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const searchParams = request.nextUrl.searchParams;

//         // ✅ Validate query parameters
//         const queryValidation = DailySalesQuery.safeParse({
//             storeId: searchParams.get("storeId"),
//             month: searchParams.get("month"),
//         });

//         if (!queryValidation.success) {
//             return NextResponse.json(
//                 {
//                     error: "Invalid query parameters",
//                     details: queryValidation.error.format(),
//                 },
//                 { status: 400 }
//             );
//         }

//         const { storeId, month } = queryValidation.data;

//         // ✅ Parse year & month safely
//         const [year, monthNum] = month.split("-");
//         const parsedYear = parseInt(year, 10);
//         const parsedMonth = parseInt(monthNum, 10);

//         // ✅ Calculate first and last day of month
//         const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
//         const endDate = new Date(
//             Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59)
//         );

//         // ✅ Timezone offset in hours (default UTC+7)
//         const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);

//         // ✅ Fetch orders for store + tenant
//         const { data: orders, error: ordersError } = await supabase
//             .from("orders")
//             .select(
//                 `
//                 id,
//                 created_at,
//                 order_items (quantity)
//             `
//             )
//             .eq("tenant_id", currentTenantId)
//             .eq("store_id", storeId)
//             .gte("created_at", startDate.toISOString())
//             .lte("created_at", endDate.toISOString())
//             .order("created_at", { ascending: true });

//         if (ordersError) {
//             console.error("Error fetching orders:", ordersError);
//             return NextResponse.json(
//                 { error: "Failed to fetch orders" },
//                 { status: 500 }
//             );
//         }

//         // ✅ Aggregate orders by *local date*
//         const dailyData: Record<string, number> = {};

//         for (const order of orders || []) {
//             if (!order.created_at) continue;

//             // Convert UTC → local time using timezone offset
//             const utcDate = new Date(order.created_at);
//             const localTime = new Date(
//                 utcDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000
//             );

//             const dateKey = localTime.toISOString().split("T")[0]; // YYYY-MM-DD (local)

//             if (!dailyData[dateKey]) dailyData[dateKey] = 0;

//             const totalCups =
//                 order.order_items?.reduce(
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     (sum: number, item: any) => sum + (item.quantity || 0),
//                     0
//                 ) ?? 0;

//             dailyData[dateKey] += totalCups;
//         }

//         // ✅ Convert to chart-friendly array
//         const chartData = Object.entries(dailyData)
//             .map(([date, cups]) => ({ date, cups }))
//             .sort((a, b) => a.date.localeCompare(b.date));

//         // ✅ Validate with Zod response schema
//         const parsedResponse = DailySalesResponse.safeParse({
//             data: chartData,
//         });
//         if (!parsedResponse.success) {
//             console.error(
//                 "DailySalesResponse validation failed:",
//                 parsedResponse.error
//             );
//             return NextResponse.json(
//                 {
//                     error: "Invalid response shape",
//                     details: parsedResponse.error.format(),
//                 },
//                 { status: 500 }
//             );
//         }

//         return NextResponse.json(parsedResponse.data, { status: 200 });
//     } catch (error) {
//         console.error("Daily sales error:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }
