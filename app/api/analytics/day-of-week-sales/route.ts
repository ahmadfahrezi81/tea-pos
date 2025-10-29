/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import {
    DayOfWeekSalesQuery,
    DayOfWeekSalesResponse,
} from "@/lib/schemas/analytics";
import { getCurrentTenantId } from "@/lib/tenant";

const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];

async function fetchAllOrderItems(
    supabase: any,
    storeId: string,
    tenantId: string,
    startDate: string,
    endDate: string
) {
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    let allOrderItems: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("order_items")
            .select(
                `
                id,
                quantity,
                order_id,
                orders!inner(store_id, created_at)
            `
            )
            .eq("tenant_id", tenantId)
            .eq("orders.store_id", storeId)
            .gte("orders.created_at", startDate)
            .lte("orders.created_at", endDate)
            .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allOrderItems = allOrderItems.concat(data);
        from += pageSize;
        to += pageSize;
    }

    return allOrderItems;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const searchParams = request.nextUrl.searchParams;

        // Validate query parameters
        const queryValidation = DayOfWeekSalesQuery.safeParse({
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

        // Parse year & month
        const [year, monthNum] = month.split("-");
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(monthNum, 10);

        // Calculate first and last day of month
        const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
        const endDate = new Date(
            Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59)
        );

        // Fetch order items
        const orderItems = await fetchAllOrderItems(
            supabase,
            storeId,
            currentTenantId,
            startDate.toISOString(),
            endDate.toISOString()
        );

        // Aggregate by day of week
        const dayOfWeekData: Record<
            number,
            { totalCups: number; dates: Set<string> }
        > = {};

        // Initialize all days
        for (let i = 0; i < 7; i++) {
            dayOfWeekData[i] = { totalCups: 0, dates: new Set() };
        }

        // Process each order item
        for (const item of orderItems) {
            if (!item.orders?.created_at) continue;

            const orderDate = new Date(item.orders.created_at);
            const dayIndex = orderDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
            const dateKey = orderDate.toISOString().split("T")[0];
            const quantity = item.quantity || 0;

            dayOfWeekData[dayIndex].totalCups += quantity;
            dayOfWeekData[dayIndex].dates.add(dateKey);
        }

        // Convert to array with averages
        const chartData = Object.entries(dayOfWeekData).map(
            ([dayIndex, data]) => {
                const index = parseInt(dayIndex, 10);
                const occurrences = data.dates.size;
                const averageCups =
                    occurrences > 0 ? data.totalCups / occurrences : 0;

                return {
                    dayOfWeek: DAY_NAMES[index],
                    dayIndex: index,
                    averageCups: Math.round(averageCups * 10) / 10, // Round to 1 decimal
                    totalCups: data.totalCups,
                    occurrences,
                };
            }
        );

        // Sort by day index (Sunday to Saturday)
        chartData.sort((a, b) => a.dayIndex - b.dayIndex);

        // Validate response
        const parsedResponse = DayOfWeekSalesResponse.safeParse({
            data: chartData,
        });

        if (!parsedResponse.success) {
            console.error(
                "DayOfWeekSalesResponse validation failed:",
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
        console.error("Day of week sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
