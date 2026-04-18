//app/api/analytics/hourly-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import {
    HourlySalesQuery,
    HourlySalesResponse,
} from "@/lib/shared/schemas/analytics";
// import { toCamelKeys } from "@/lib/shared/utils/cn/schemas";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        // ✅ Validate query parameters
        const queryResult = HourlySalesQuery.safeParse(
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

        const { storeId, date } = queryResult.data;

        // ✅ Build start & end time (local timezone, UTC+7 by default)
        const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);
        const start = new Date(
            `${date}T00:00:00+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`,
        ).toISOString();
        const end = new Date(
            `${date}T23:59:59+${String(TIMEZONE_OFFSET).padStart(2, "0")}:00`,
        ).toISOString();

        // ✅ Fetch orders for store + tenant within date
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select(
                `
                id,
                created_at,
                order_items(quantity)
            `,
            )
            .eq("tenant_id", currentTenantId)
            .eq("store_id", storeId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true });

        if (ordersError) {
            console.error("Error fetching orders:", ordersError);
            return NextResponse.json(
                { error: "Failed to fetch orders" },
                { status: 500 },
            );
        }

        // ✅ Aggregate into hourly buckets (using local timezone offset)
        const hourlyData: Record<string, number> = {};

        for (const order of orders || []) {
            // Skip if created_at is missing or null
            if (!order.created_at) continue;

            const utcDate = new Date(order.created_at as string);

            // Convert UTC → local time (based on TIMEZONE_OFFSET)
            const localTime = new Date(
                utcDate.getTime() + TIMEZONE_OFFSET * 60 * 60 * 1000,
            );

            const hourKey = `${localTime
                .getHours()
                .toString()
                .padStart(2, "0")}:00`;

            if (!hourlyData[hourKey]) hourlyData[hourKey] = 0;

            const totalCups =
                order.order_items?.reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (sum: number, item: any) => sum + (item.quantity || 0),
                    0,
                ) ?? 0;

            hourlyData[hourKey] += totalCups;
        }

        // ✅ Build all 24 hourly slots
        const allSlots: Record<string, number> = {};
        for (let h = 0; h < 24; h++) {
            const slot = `${h.toString().padStart(2, "0")}:00`;
            allSlots[slot] = hourlyData[slot] ?? 0;
        }

        const allChartData = Object.entries(allSlots)
            .map(([hour, cups]) => ({ hour, cups }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        // ✅ Trim to first/last non-zero with 1 slot buffer on each side
        const firstNonZero = allChartData.findIndex((d) => d.cups > 0);
        const lastNonZero = allChartData.findLastIndex((d) => d.cups > 0);

        const chartData =
            firstNonZero === -1
                ? [] // no data at all
                : allChartData.slice(
                      Math.max(0, firstNonZero - 1), // 1 zero before
                      Math.min(23, lastNonZero + 1) + 1, // 1 zero after
                  );

        // ✅ Validate with your Zod response schema
        const parsed = HourlySalesResponse.safeParse({ data: chartData });
        if (!parsed.success) {
            console.error(
                "HourlySalesResponse validation failed:",
                parsed.error,
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 200 });
    } catch (error) {
        console.error("Hourly sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
