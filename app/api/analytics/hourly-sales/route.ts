// app/api/analytics/hourly-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerComponentClient } from "@/lib/supabase/server";
import { HourlySalesQuery, HourlySalesResponse } from "@/lib/schemas/analytics";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerComponentClient();
        const searchParams = request.nextUrl.searchParams;

        // Validate query parameters
        const queryValidation = HourlySalesQuery.safeParse({
            storeId: searchParams.get("storeId"),
            date: searchParams.get("date"),
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

        const { storeId, date } = queryValidation.data;

        // Fetch all orders for the date
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select(
                `
                id,
                created_at,
                order_items (
                    quantity
                )
            `
            )
            .eq("store_id", storeId)
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${date}T23:59:59`)
            .order("created_at", { ascending: true });

        if (ordersError) {
            console.error("Error fetching orders:", ordersError);
            return NextResponse.json(
                { error: "Failed to fetch orders" },
                { status: 500 }
            );
        }

        // Aggregate by hour
        const hourlyData: { [hour: string]: number } = {};

        orders?.forEach((order) => {
            const orderDate = new Date(order.created_at + "Z");
            const hour = orderDate.getHours(); // 0-23
            const hourKey = `${hour.toString().padStart(2, "0")}:00`;

            if (!hourlyData[hourKey]) {
                hourlyData[hourKey] = 0;
            }

            // Sum all quantities from order items
            const totalCups = order.order_items.reduce(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sum: number, item: any) => sum + item.quantity,
                0
            );
            hourlyData[hourKey] += totalCups;
        });

        // Convert to array format for chart and validate response
        const chartData = Object.entries(hourlyData)
            .map(([hour, cups]) => ({
                hour,
                cups,
            }))
            .sort((a, b) => a.hour.localeCompare(b.hour));

        const response = HourlySalesResponse.parse({ data: chartData });
        return NextResponse.json(response);
    } catch (error) {
        console.error("Hourly sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
