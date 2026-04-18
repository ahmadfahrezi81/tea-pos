/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import {
    DayOfWeekSalesQuery,
    DayOfWeekSalesResponse,
} from "@/lib/shared/schemas/analytics";
import { getCurrentTenantId } from "@/lib/server/config/tenant";

const TZ_OFFSET_HOURS = 7; // WIB (UTC+7)

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
    endDate: string,
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
            `,
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
                { status: 400 },
            );
        }

        const { storeId, month } = queryValidation.data;

        const [year, monthNum] = month.split("-");
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(monthNum, 10);

        // Start of month in UTC (00:00 WIB = 17:00 UTC previous day,
        // but first order can't be before 00:00 WIB so UTC start is fine)
        const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));

        // End of month — cover until 23:59:59 WIB of last day
        // Last WIB day ends at 23:59:59 WIB = 16:59:59 UTC next day
        const endDate = new Date(
            Date.UTC(parsedYear, parsedMonth, 1, 16, 59, 59),
        );

        const orderItems = await fetchAllOrderItems(
            supabase,
            storeId,
            currentTenantId,
            startDate.toISOString(),
            endDate.toISOString(),
        );

        // Initialize all days
        const dayOfWeekData: Record<
            number,
            { totalCups: number; dates: Set<string> }
        > = {};
        for (let i = 0; i < 7; i++) {
            dayOfWeekData[i] = { totalCups: 0, dates: new Set() };
        }

        // Aggregate by local (WIB) day of week
        for (const item of orderItems) {
            if (!item.orders?.created_at) continue;

            const utcDate = new Date(item.orders.created_at);

            // Shift to WIB before extracting day and date
            const localDate = new Date(
                utcDate.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000,
            );
            const dayIndex = localDate.getUTCDay(); // correct local day
            const dateKey = localDate.toISOString().split("T")[0]; // correct local date
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
                    averageCups: Math.round(averageCups * 10) / 10,
                    totalCups: data.totalCups,
                    occurrences,
                };
            },
        );

        chartData.sort((a, b) => a.dayIndex - b.dayIndex);

        const parsedResponse = DayOfWeekSalesResponse.safeParse({
            data: chartData,
        });

        if (!parsedResponse.success) {
            console.error(
                "DayOfWeekSalesResponse validation failed:",
                parsedResponse.error,
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsedResponse.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsedResponse.data, { status: 200 });
    } catch (error) {
        console.error("Day of week sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
