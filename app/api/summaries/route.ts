// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@/lib/supabase/server";

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);
//         const storeId = searchParams.get("storeId");
//         const month = searchParams.get("month"); // Format: YYYY-MM

//         if (!storeId || !month) {
//             return NextResponse.json(
//                 { error: "Store ID and month are required" },
//                 { status: 400 }
//             );
//         }

//         // Get start and end of month
//         const startDate = `${month}-01`;
//         const endDate = new Date(month + "-01");
//         endDate.setMonth(endDate.getMonth() + 1);
//         endDate.setDate(0);
//         const endDateStr = endDate.toISOString().split("T")[0];

//         // Fetch daily summaries for the month
//         const { data: summaries, error: summariesError } = await supabase
//             .from("daily_summaries")
//             .select(
//                 `
//                 *,
//                 stores(name),
//                 manager:profiles!daily_summaries_manager_id_fkey(full_name),
//                 seller:profiles!daily_summaries_seller_id_fkey(full_name)
//             `
//             )
//             .eq("store_id", storeId)
//             .gte("date", startDate)
//             .lte("date", endDateStr)
//             .order("date", { ascending: false });

//         if (summariesError) throw summariesError;

//         // console.log("SUMMARIES", summaries);

//         // Fetch orders for product breakdown
//         const { data: orders, error: ordersError } = await supabase
//             // .from("orders")
//             // .select(
//             //     `
//             //     id,
//             //     total_amount,
//             //     created_at,
//             //     order_items(
//             //         quantity,
//             //         price,
//             //         products(name, category)
//             //     )
//             // `
//             // )
//             .from("orders")
//             .select(
//                 `
//     id,
//     total_amount,
//     created_at,
//     order_items(
//         quantity,
//         unit_price,
//         total_price,
//         products(name, price, image_url)
//     )
// `
//             )

//             .eq("store_id", storeId)
//             .gte("created_at", `${startDate}T00:00:00`)
//             .lt("created_at", `${endDateStr}T23:59:59`);

//         if (ordersError) throw ordersError;

//         // Group orders by date and calculate product breakdown
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         const ordersByDate: Record<string, any[]> = {};
//         orders?.forEach((order) => {
//             const date = order.created_at.split("T")[0];
//             if (!ordersByDate[date]) {
//                 ordersByDate[date] = [];
//             }
//             ordersByDate[date].push(order);
//         });

//         // Calculate product breakdown for each date
//         const productBreakdown: Record<
//             string,
//             Record<string, { quantity: number; revenue: number }>
//         > = {};
//         Object.entries(ordersByDate).forEach(([date, dateOrders]) => {
//             productBreakdown[date] = {};
//             dateOrders.forEach((order) => {
//                 // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                 order.order_items?.forEach((item: any) => {
//                     const productName = item.products?.name || "Unknown";
//                     if (!productBreakdown[date][productName]) {
//                         productBreakdown[date][productName] = {
//                             quantity: 0,
//                             revenue: 0,
//                         };
//                     }
//                     productBreakdown[date][productName].quantity +=
//                         item.quantity;
//                     productBreakdown[date][productName].revenue +=
//                         item.price * item.quantity;
//                 });
//             });
//         });

//         // Calculate monthly totals
//         const totalSales =
//             summaries?.reduce((sum, summary) => sum + summary.total_sales, 0) ||
//             0;
//         const totalOrders = orders?.length || 0;
//         const totalCups = Object.values(productBreakdown).reduce(
//             (total, dayBreakdown) =>
//                 total +
//                 Object.values(dayBreakdown).reduce(
//                     (dayTotal, product) => dayTotal + product.quantity,
//                     0
//                 ),
//             0
//         );

//         return NextResponse.json({
//             summaries: summaries || [],
//             productBreakdown,
//             monthlyTotals: {
//                 totalSales,
//                 totalOrders,
//                 totalCups,
//             },
//         });
//     } catch (error) {
//         console.error("Error fetching summaries:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function POST(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();
//         const { storeId, sellerId, managerId, date, openingBalance } = body;

//         if (!storeId || !sellerId || !managerId || !date) {
//             return NextResponse.json(
//                 { error: "Missing required fields" },
//                 { status: 400 }
//             );
//         }

//         // Check if summary already exists
//         const { count, error: existsError } = await supabase
//             .from("daily_summaries")
//             .select("id", { count: "exact", head: true })
//             .eq("store_id", storeId)
//             .eq("date", date);

//         if (existsError) throw existsError;
//         if ((count ?? 0) > 0) {
//             return NextResponse.json(
//                 { error: "Daily summary already exists for this date" },
//                 { status: 409 }
//             );
//         }

//         const { data, error } = await supabase
//             .from("daily_summaries")
//             .insert({
//                 store_id: storeId,
//                 seller_id: sellerId,
//                 manager_id: managerId,
//                 date,
//                 opening_balance: openingBalance || 0,
//                 total_sales: 0,
//                 expected_cash: openingBalance || 0,
//             })
//             .select()
//             .single();

//         if (error) throw error;

//         return NextResponse.json(data);
//     } catch (error) {
//         console.error("Error creating summary:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function PUT(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();
//         const { id, ...updates } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Summary ID is required" },
//                 { status: 400 }
//             );
//         }

//         const { data, error } = await supabase
//             .from("daily_summaries")
//             .update(updates)
//             .eq("id", id)
//             .select()
//             .single();

//         if (error) throw error;

//         return NextResponse.json(data);
//     } catch (error) {
//         console.error("Error updating summary:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }

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

        // Fetch daily summaries with correct field names and relationships
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
            // .gte("date", startDate)
            // .lte("date", endDateStr)
            .gte("created_at", `${startDate}T17:00:00Z`) // 00:00 UTC+7 = 17:00 UTC previous day
            .lte("created_at", `${endDateStr}T16:59:59Z`) // 23:59 UTC+7 = 16:59 UTC next day
            .order("date", { ascending: false });

        if (summariesError) {
            console.error("Summaries error:", summariesError);
            throw summariesError;
        }

        // Fetch orders for product breakdown and calculations
        const { data: orders, error: ordersError } = await supabase
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
            // .gte("created_at", `${startDate}T00:00:00`)
            // .lte("created_at", `${endDateStr}T23:59:59`)
            .gte("created_at", `${startDate}T17:00:00Z`) // 00:00 UTC+7 = 17:00 UTC previous day
            .lte("created_at", `${endDateStr}T16:59:59Z`) // 23:59 UTC+7 = 16:59 UTC next day
            .order("created_at", { ascending: true });

        if (ordersError) {
            console.error("Orders error:", ordersError);
            throw ordersError;
        }

        // Group orders by date and calculate accurate totals
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersByDate: Record<string, any[]> = {};
        const salesByDate: Record<string, number> = {};

        orders?.forEach((order) => {
            // const date = order.created_at.split("T")[0];
            // if (!ordersByDate[date]) {
            //     ordersByDate[date] = [];
            //     salesByDate[date] = 0;
            // }
            const utcDate = new Date(order.created_at);
            const indonesianDate = new Date(
                utcDate.getTime() + 7 * 60 * 60 * 1000
            );
            const date = indonesianDate.toISOString().split("T")[0];
            if (!ordersByDate[date]) {
                ordersByDate[date] = [];
                salesByDate[date] = 0;
            }

            ordersByDate[date].push(order);
            // Use the order's total_amount for accurate sales calculation
            salesByDate[date] += order.total_amount;
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
                    const productName =
                        item.products?.name || "Unknown Product";
                    if (!productBreakdown[date][productName]) {
                        productBreakdown[date][productName] = {
                            quantity: 0,
                            revenue: 0,
                        };
                    }
                    productBreakdown[date][productName].quantity +=
                        item.quantity;
                    // Use total_price from order_items for accurate revenue
                    productBreakdown[date][productName].revenue +=
                        item.total_price;
                });
            });
        });

        // Update daily summaries with accurate sales totals
        const updatedSummaries = await Promise.all(
            (summaries || []).map(async (summary) => {
                const actualSales = salesByDate[summary.date] || 0;

                // Only update if there's a discrepancy and we have actual sales
                if (actualSales !== summary.total_sales && actualSales > 0) {
                    const newExpectedCash =
                        summary.opening_balance + actualSales;

                    try {
                        const { data: updatedSummary } = await supabase
                            .from("daily_summaries")
                            .update({
                                total_sales: actualSales,
                                expected_cash: newExpectedCash,
                            })
                            .eq("id", summary.id)
                            .select()
                            .single();

                        return (
                            updatedSummary || {
                                ...summary,
                                total_sales: actualSales,
                                expected_cash: newExpectedCash,
                            }
                        );
                    } catch (updateError) {
                        console.error("Error updating summary:", updateError);
                        // Return the summary with corrected values even if DB update fails
                        return {
                            ...summary,
                            total_sales: actualSales,
                            expected_cash:
                                summary.opening_balance + actualSales,
                        };
                    }
                }

                return summary;
            })
        );

        // Calculate accurate monthly totals
        const totalSales = Object.values(salesByDate).reduce(
            (sum, sales) => sum + sales,
            0
        );
        const totalOrders = orders?.length || 0;

        // Calculate total cups more efficiently
        const totalCups = Object.values(productBreakdown).reduce(
            (monthTotal, dayBreakdown) =>
                monthTotal +
                Object.values(dayBreakdown).reduce(
                    (dayTotal, product) => dayTotal + product.quantity,
                    0
                ),
            0
        );

        return NextResponse.json({
            summaries: updatedSummaries || [],
            productBreakdown,
            ordersByDate,
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

        if (!storeId || !sellerId || !date) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if summary already exists for this store and date
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

        // Get any existing orders for this date to calculate initial total_sales
        const { data: existingOrders, error: ordersError } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            // .gte("created_at", `${date}T00:00:00`)
            // .lte("created_at", `${date}T23:59:59`);
            .gte("created_at", `${date}T17:00:00Z`) // 00:00 UTC+7 = 17:00 UTC previous day
            .lte("created_at", `${date}T16:59:59Z`); // 23:59 UTC+7 = 16:59 UTC next day

        if (ordersError) throw ordersError;

        const totalSales =
            existingOrders?.reduce(
                (sum, order) => sum + order.total_amount,
                0
            ) || 0;

        const opening = openingBalance || 0;
        const expectedCash = opening + totalSales;

        const { data, error } = await supabase
            .from("daily_summaries")
            .insert({
                store_id: storeId,
                seller_id: sellerId, // Correct field name
                manager_id: managerId || null,
                date,
                opening_balance: opening,
                total_sales: totalSales,
                expected_cash: expectedCash,
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

        // If updating opening_balance, recalculate expected_cash
        if (updates.opening_balance !== undefined) {
            const { data: currentSummary } = await supabase
                .from("daily_summaries")
                .select("total_sales")
                .eq("id", id)
                .single();

            if (currentSummary) {
                updates.expected_cash =
                    updates.opening_balance + currentSummary.total_sales;
            }
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
