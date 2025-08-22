import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");
        const month = searchParams.get("month"); // Format: YYYY-MM

        if (!storeId || !month) {
            return NextResponse.json(
                { error: "Store ID and month are required" },
                { status: 400 }
            );
        }

        // Get start and end of month
        const startDate = `${month}-01`;
        const endDate = new Date(month + "-01");
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const endDateStr = endDate.toISOString().split("T")[0];

        // Fetch daily summaries for the month
        const { data: summaries, error: summariesError } = await supabase
            .from("daily_summaries")
            .select(
                `
                *,
                stores(name),
                manager:profiles!daily_summaries_manager_id_fkey(full_name),
                seller:profiles!daily_summaries_seller_id_fkey(full_name)
            `
            )
            .eq("store_id", storeId)
            .gte("date", startDate)
            .lte("date", endDateStr)
            .order("date", { ascending: false });

        if (summariesError) throw summariesError;

        // console.log("SUMMARIES", summaries);

        // Fetch orders for product breakdown
        const { data: orders, error: ordersError } = await supabase
            // .from("orders")
            // .select(
            //     `
            //     id,
            //     total_amount,
            //     created_at,
            //     order_items(
            //         quantity,
            //         price,
            //         products(name, category)
            //     )
            // `
            // )
            .from("orders")
            .select(
                `
    id,
    total_amount,
    created_at,
    order_items(
        quantity,
        unit_price,
        total_price,
        products(name, price, image_url)
    )
`
            )

            .eq("store_id", storeId)
            .gte("created_at", `${startDate}T00:00:00`)
            .lt("created_at", `${endDateStr}T23:59:59`);

        if (ordersError) throw ordersError;

        // Group orders by date and calculate product breakdown
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersByDate: Record<string, any[]> = {};
        orders?.forEach((order) => {
            const date = order.created_at.split("T")[0];
            if (!ordersByDate[date]) {
                ordersByDate[date] = [];
            }
            ordersByDate[date].push(order);
        });

        // Calculate product breakdown for each date
        const productBreakdown: Record<
            string,
            Record<string, { quantity: number; revenue: number }>
        > = {};
        Object.entries(ordersByDate).forEach(([date, dateOrders]) => {
            productBreakdown[date] = {};
            dateOrders.forEach((order) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                order.order_items?.forEach((item: any) => {
                    const productName = item.products?.name || "Unknown";
                    if (!productBreakdown[date][productName]) {
                        productBreakdown[date][productName] = {
                            quantity: 0,
                            revenue: 0,
                        };
                    }
                    productBreakdown[date][productName].quantity +=
                        item.quantity;
                    productBreakdown[date][productName].revenue +=
                        item.price * item.quantity;
                });
            });
        });

        // Calculate monthly totals
        const totalSales =
            summaries?.reduce((sum, summary) => sum + summary.total_sales, 0) ||
            0;
        const totalOrders = orders?.length || 0;
        const totalCups = Object.values(productBreakdown).reduce(
            (total, dayBreakdown) =>
                total +
                Object.values(dayBreakdown).reduce(
                    (dayTotal, product) => dayTotal + product.quantity,
                    0
                ),
            0
        );

        return NextResponse.json({
            summaries: summaries || [],
            productBreakdown,
            monthlyTotals: {
                totalSales,
                totalOrders,
                totalCups,
            },
        });
    } catch (error) {
        console.error("Error fetching summaries:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { storeId, sellerId, managerId, date, openingBalance } = body;

        if (!storeId || !sellerId || !managerId || !date) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if summary already exists
        const { count, error: existsError } = await supabase
            .from("daily_summaries")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("date", date);

        if (existsError) throw existsError;
        if ((count ?? 0) > 0) {
            return NextResponse.json(
                { error: "Daily summary already exists for this date" },
                { status: 409 }
            );
        }

        const { data, error } = await supabase
            .from("daily_summaries")
            .insert({
                store_id: storeId,
                seller_id: sellerId,
                manager_id: managerId,
                date,
                opening_balance: openingBalance || 0,
                total_sales: 0,
                expected_cash: openingBalance || 0,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating summary:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Summary ID is required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("daily_summaries")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error updating summary:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
