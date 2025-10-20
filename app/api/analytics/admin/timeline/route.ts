// app/api/analytics/admin/timeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import {
    AdminDateRangeQuery,
    AdminTimelineResponse,
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
                created_at,
                order_items(quantity),
                store_id
            `
            )
            .eq("tenant_id", tenantId)
            .gte("created_at", startDate)
            .lte("created_at", endDate)
            .order("created_at", { ascending: true })
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

        // Determine granularity (same day = hourly, otherwise daily)
        const granularity = dateFrom === dateTo ? "hourly" : "daily";

        // Fetch orders for date range with pagination (optionally filtered by stores)
        const orders = await fetchAllOrders(
            supabase,
            currentTenantId,
            start,
            end,
            storeIds
        );

        // Aggregate data based on granularity
        const timelineData: Record<string, { orders: number; cups: number }> =
            {};

        for (const order of orders || []) {
            if (!order.created_at) continue;

            const utcDate = new Date(order.created_at as string);
            const localTime = new Date(
                utcDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000
            );

            let key: string;
            if (granularity === "hourly") {
                key = `${localTime.getHours().toString().padStart(2, "0")}:00`;
            } else {
                const year = localTime.getFullYear();
                const month = String(localTime.getMonth() + 1).padStart(2, "0");
                const day = String(localTime.getDate()).padStart(2, "0");
                key = `${year}-${month}-${day}`;
            }

            if (!timelineData[key]) {
                timelineData[key] = { orders: 0, cups: 0 };
            }

            timelineData[key].orders += 1;

            const totalCups =
                order.order_items?.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, item: any) => sum + (item.quantity || 0),
                    0
                ) ?? 0;

            timelineData[key].cups += totalCups;
        }

        // Convert to array and sort
        const chartData = Object.entries(timelineData)
            .map(([label, data]) => ({
                label,
                orders: data.orders,
                cups: data.cups,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));

        // For hourly data, fill in missing hours with 0
        if (granularity === "hourly") {
            const filledData = [];
            for (let hour = 0; hour < 24; hour++) {
                const hourKey = `${hour.toString().padStart(2, "0")}:00`;
                const existing = chartData.find((d) => d.label === hourKey);
                filledData.push(
                    existing || { label: hourKey, orders: 0, cups: 0 }
                );
            }
            chartData.length = 0;
            chartData.push(...filledData);
        } else {
            // For daily data, fill in missing dates with 0
            const startDate = new Date(dateFrom);
            const endDate = new Date(dateTo);
            const filledData = [];

            for (
                let d = new Date(startDate);
                d <= endDate;
                d.setDate(d.getDate() + 1)
            ) {
                const dateKey = d.toISOString().split("T")[0];
                const existing = chartData.find(
                    (item) => item.label === dateKey
                );
                filledData.push(
                    existing || { label: dateKey, orders: 0, cups: 0 }
                );
            }

            chartData.length = 0;
            chartData.push(...filledData);
        }

        // Validate response
        const parsed = AdminTimelineResponse.safeParse({
            data: chartData,
            granularity,
        });

        if (!parsed.success) {
            console.error(
                "AdminTimelineResponse validation failed:",
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
        console.error("Admin timeline error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
