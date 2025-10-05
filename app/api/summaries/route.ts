// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { Expense } from "@/lib/hooks/useSummaries";
// import { getCurrentTenantId } from "@/lib/tenant";

// async function fetchAllOrders(
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     supabase: any,
//     storeId: string,
//     startDate: string,
//     endDateStr: string
// ) {
//     const pageSize = 1000;
//     let from = 0;
//     let to = pageSize - 1;
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     let allOrders: any[] = [];

//     while (true) {
//         const { data, error } = await supabase
//             .from("orders")
//             .select(
//                 `
//                 id,
//                 total_amount,
//                 created_at,
//                 order_items(
//                     quantity,
//                     unit_price,
//                     total_price,
//                     products(name, price, image_url)
//                 )
//             `
//             )
//             .eq("store_id", storeId)
//             .gte("created_at", `${startDate}T00:00:00Z`)
//             .lte("created_at", `${endDateStr}T23:59:59Z`)
//             .order("created_at", { ascending: true })
//             .range(from, to);

//         if (error) throw error;
//         if (!data || data.length === 0) break;

//         allOrders = allOrders.concat(data);

//         // Move to next page
//         from += pageSize;
//         to += pageSize;
//     }

//     return allOrders;
// }

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();

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

//         console.log(
//             "Filtering summaries between:",
//             startDate,
//             "and",
//             endDateStr
//         );

//         // Fetch daily summaries - FIXED: Filter by 'date' field, not 'created_at'
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
//             .eq("tenant_id", currentTenantId) // 👈 ADD THIS
//             .gte("date", startDate) // FIXED: Use 'date' field
//             .lte("date", endDateStr) // FIXED: Use 'date' field
//             .order("date", { ascending: false });

//         console.log("Found summaries:", summaries?.length || 0);

//         if (summariesError) {
//             console.error("Summaries error:", summariesError);
//             throw summariesError;
//         }

//         // Fetch expenses for all summaries
//         const summaryIds = summaries?.map((s) => s.id) || [];
//         const { data: expenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("*")
//             .in("daily_summary_id", summaryIds)
//             .eq("tenant_id", currentTenantId); // 👈 ADD THIS

//         if (expensesError) {
//             console.error("Expenses error:", expensesError);
//             throw expensesError;
//         }

//         // Group expenses by daily_summary_id
//         const expensesBySummaryId: Record<string, Expense[]> = {};
//         const expensesByDate: Record<string, Expense[]> = {};
//         let totalMonthlyExpenses = 0;

//         expenses?.forEach((expense) => {
//             if (!expensesBySummaryId[expense.daily_summary_id]) {
//                 expensesBySummaryId[expense.daily_summary_id] = [];
//             }
//             expensesBySummaryId[expense.daily_summary_id].push(expense);

//             // Find the summary to get the date
//             const summary = summaries?.find(
//                 (s) => s.id === expense.daily_summary_id
//             );
//             if (summary) {
//                 if (!expensesByDate[summary.date]) {
//                     expensesByDate[summary.date] = [];
//                 }
//                 expensesByDate[summary.date].push(expense);
//             }

//             totalMonthlyExpenses += expense.amount;
//         });

//         const orders = await fetchAllOrders(
//             supabase,
//             storeId,
//             startDate,
//             endDateStr
//         );

//         // Group orders by date and calculate accurate totals
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         const ordersByDate: Record<string, any[]> = {};
//         const salesByDate: Record<string, number> = {};

//         orders?.forEach((order) => {
//             const utcDate = new Date(order.created_at);
//             const indonesianDate = new Date(
//                 utcDate.getTime() + 7 * 60 * 60 * 1000
//             );
//             const date = indonesianDate.toISOString().split("T")[0];
//             if (!ordersByDate[date]) {
//                 ordersByDate[date] = [];
//                 salesByDate[date] = 0;
//             }

//             ordersByDate[date].push(order);
//             salesByDate[date] += order.total_amount;
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
//                     const productName =
//                         item.products?.name || "Unknown Product";
//                     if (!productBreakdown[date][productName]) {
//                         productBreakdown[date][productName] = {
//                             quantity: 0,
//                             revenue: 0,
//                         };
//                     }
//                     productBreakdown[date][productName].quantity +=
//                         item.quantity;
//                     productBreakdown[date][productName].revenue +=
//                         item.total_price;
//                 });
//             });
//         });

//         // Update daily summaries with accurate sales totals and expense calculations
//         const updatedSummaries = await Promise.all(
//             (summaries || []).map(async (summary) => {
//                 const actualSales = salesByDate[summary.date] || 0;
//                 const summaryExpenses = expensesBySummaryId[summary.id] || [];
//                 const totalExpenses = summaryExpenses.reduce(
//                     (sum, exp) => sum + exp.amount,
//                     0
//                 );

//                 const newExpectedCash =
//                     summary.opening_balance + actualSales - totalExpenses;

//                 const needsUpdate =
//                     actualSales !== summary.total_sales ||
//                     newExpectedCash !== summary.expected_cash;

//                 if (needsUpdate) {
//                     try {
//                         const { data: updatedSummary } = await supabase
//                             .from("daily_summaries")
//                             .update({
//                                 total_sales: actualSales,
//                                 expected_cash: newExpectedCash,
//                             })
//                             .eq("id", summary.id)
//                             .select()
//                             .single();

//                         return (
//                             updatedSummary || {
//                                 ...summary,
//                                 total_sales: actualSales,
//                                 expected_cash: newExpectedCash,
//                                 expenses: summaryExpenses,
//                                 total_expenses: totalExpenses,
//                             }
//                         );
//                     } catch (updateError) {
//                         console.error("Error updating summary:", updateError);
//                         return {
//                             ...summary,
//                             total_sales: actualSales,
//                             expected_cash: newExpectedCash,
//                             expenses: summaryExpenses,
//                             total_expenses: totalExpenses,
//                         };
//                     }
//                 }

//                 return {
//                     ...summary,
//                     expenses: summaryExpenses,
//                     total_expenses: totalExpenses,
//                 };
//             })
//         );

//         // Calculate accurate monthly totals
//         const totalSales = Object.values(salesByDate).reduce(
//             (sum, sales) => sum + sales,
//             0
//         );
//         const totalOrders = orders?.length || 0;

//         const totalCups = Object.values(productBreakdown).reduce(
//             (monthTotal, dayBreakdown) =>
//                 monthTotal +
//                 Object.values(dayBreakdown).reduce(
//                     (dayTotal, product) => dayTotal + product.quantity,
//                     0
//                 ),
//             0
//         );

//         const response = {
//             summaries: updatedSummaries || [],
//             productBreakdown,
//             ordersByDate,
//             expensesByDate,
//             monthlyTotals: {
//                 totalSales,
//                 totalOrders,
//                 totalCups,
//                 totalExpenses: totalMonthlyExpenses,
//             },
//         };

//         console.log("API Response summary count:", response.summaries.length);
//         return NextResponse.json(response);
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

//         if (!storeId || !sellerId || !date) {
//             return NextResponse.json(
//                 { error: "Missing required fields" },
//                 { status: 400 }
//             );
//         }

//         // Get tenant_id from parent store
//         const { data: store, error: storeError } = await supabase
//             .from("stores")
//             .select("tenant_id")
//             .eq("id", storeId)
//             .single();

//         if (storeError || !store || !store.tenant_id) {
//             return NextResponse.json(
//                 { error: "Invalid storeId or store missing tenant_id" },
//                 { status: 400 }
//             );
//         }

//         // Check if summary already exists for this store & date
//         const { count, error: existsError } = await supabase
//             .from("daily_summaries")
//             .select("id", { count: "exact", head: true })
//             .eq("store_id", storeId)
//             .eq("date", date)
//             .eq("tenant_id", store.tenant_id);

//         if (existsError) throw existsError;
//         if ((count ?? 0) > 0) {
//             return NextResponse.json(
//                 { error: "Daily summary already exists for this date" },
//                 { status: 409 }
//             );
//         }

//         // Get existing orders for this date (scoped to tenant)
//         const { data: existingOrders, error: ordersError } = await supabase
//             .from("orders")
//             .select("total_amount")
//             .eq("store_id", storeId)
//             .eq("tenant_id", store.tenant_id)
//             .gte("created_at", `${date}T17:00:00Z`)
//             .lte("created_at", `${date}T16:59:59Z`);

//         if (ordersError) throw ordersError;

//         const totalSales =
//             existingOrders?.reduce(
//                 (sum, order) => sum + order.total_amount,
//                 0
//             ) || 0;

//         const opening = openingBalance || 0;
//         const expectedCash = opening + totalSales;

//         // Insert summary with inherited tenant_id
//         const { data, error } = await supabase
//             .from("daily_summaries")
//             .insert({
//                 store_id: storeId,
//                 seller_id: sellerId,
//                 manager_id: managerId || null,
//                 date,
//                 opening_balance: opening,
//                 total_sales: totalSales,
//                 expected_cash: expectedCash,
//                 tenant_id: store.tenant_id, // from parent store
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
//         const currentTenantId = await getCurrentTenantId();

//         const body = await request.json();
//         const { id, ...updates } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Summary ID is required" },
//                 { status: 400 }
//             );
//         }

//         // If updating opening_balance, recalculate expected_cash including expenses
//         if (updates.opening_balance !== undefined) {
//             const { data: currentSummary } = await supabase
//                 .from("daily_summaries")
//                 .select("total_sales")
//                 .eq("id", id)
//                 .eq("tenant_id", currentTenantId) // 👈 ADD THIS
//                 .single();

//             // Get total expenses for this summary
//             const { data: expenses } = await supabase
//                 .from("expenses")
//                 .select("amount")
//                 .eq("daily_summary_id", id);

//             const totalExpenses =
//                 expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//             if (currentSummary) {
//                 updates.expected_cash =
//                     updates.opening_balance +
//                     currentSummary.total_sales -
//                     totalExpenses;
//             }
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
// }

// app/api/summaries/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateDailySummaryInput,
    UpdateDailySummaryInput,
    ListDailySummariesQuery,
    DailySummaryListResponse,
    CreateDailySummaryResponse,
    UpdateDailySummaryResponse,
} from "@/lib/schemas/daily-summaries";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// HELPER: Fetch all orders with pagination
// ============================================================================
async function fetchAllOrders(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    storeId: string,
    tenantId: string,
    startDate: string,
    endDateStr: string
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
            .eq("tenant_id", tenantId)
            .gte("created_at", `${startDate}T00:00:00Z`)
            .lte("created_at", `${endDateStr}T23:59:59Z`)
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

// ============================================================================
// GET /api/summaries
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListDailySummariesQuery.safeParse(
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

        const { storeId, month } = queryResult.data;

        if (!storeId || !month) {
            return NextResponse.json(
                { error: "Store ID and month are required" },
                { status: 400 }
            );
        }

        // Calculate date range for the month
        const startDate = `${month}-01`;
        const endDate = new Date(month + "-01");
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const endDateStr = endDate.toISOString().split("T")[0];

        // Fetch daily summaries
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
            .eq("tenant_id", currentTenantId)
            .gte("date", startDate)
            .lte("date", endDateStr)
            .order("date", { ascending: false });

        if (summariesError) {
            return NextResponse.json(
                { error: summariesError.message },
                { status: 400 }
            );
        }

        // Fetch expenses for all summaries
        const summaryIds = summaries?.map((s) => s.id) || [];
        const { data: expenses, error: expensesError } = await supabase
            .from("expenses")
            .select("*")
            .in("daily_summary_id", summaryIds)
            .eq("tenant_id", currentTenantId);

        if (expensesError) {
            return NextResponse.json(
                { error: expensesError.message },
                { status: 400 }
            );
        }

        // Group expenses by summary_id and by date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expensesBySummaryId: Record<string, any[]> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const expensesByDate: Record<string, any[]> = {};
        let totalMonthlyExpenses = 0;

        expenses?.forEach((expense) => {
            if (!expensesBySummaryId[expense.daily_summary_id]) {
                expensesBySummaryId[expense.daily_summary_id] = [];
            }
            expensesBySummaryId[expense.daily_summary_id].push(expense);

            const summary = summaries?.find(
                (s) => s.id === expense.daily_summary_id
            );
            if (summary) {
                if (!expensesByDate[summary.date]) {
                    expensesByDate[summary.date] = [];
                }
                expensesByDate[summary.date].push(expense);
            }

            totalMonthlyExpenses += expense.amount;
        });

        // Fetch all orders for the month
        const orders = await fetchAllOrders(
            supabase,
            storeId,
            currentTenantId,
            startDate,
            endDateStr
        );

        // Group orders by date and calculate sales
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ordersByDate: Record<string, any[]> = {};
        const salesByDate: Record<string, number> = {};

        orders?.forEach((order) => {
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
                    productBreakdown[date][productName].revenue +=
                        item.total_price;
                });
            });
        });

        // Update summaries with actual sales and expense calculations
        const updatedSummaries = await Promise.all(
            (summaries || []).map(async (summary) => {
                const actualSales = salesByDate[summary.date] || 0;
                const summaryExpenses = expensesBySummaryId[summary.id] || [];
                const totalExpenses = summaryExpenses.reduce(
                    (sum, exp) => sum + exp.amount,
                    0
                );

                const newExpectedCash =
                    summary.opening_balance + actualSales - totalExpenses;

                const needsUpdate =
                    actualSales !== summary.total_sales ||
                    newExpectedCash !== summary.expected_cash;

                if (needsUpdate) {
                    try {
                        const { data: updatedSummary } = await supabase
                            .from("daily_summaries")
                            .update({
                                total_sales: actualSales,
                                expected_cash: newExpectedCash,
                            })
                            .eq("id", summary.id)
                            .eq("tenant_id", currentTenantId)
                            .select()
                            .single();

                        return (
                            updatedSummary || {
                                ...summary,
                                total_sales: actualSales,
                                expected_cash: newExpectedCash,
                                expenses: summaryExpenses,
                                total_expenses: totalExpenses,
                            }
                        );
                    } catch (updateError) {
                        console.error("Error updating summary:", updateError);
                        return {
                            ...summary,
                            total_sales: actualSales,
                            expected_cash: newExpectedCash,
                            expenses: summaryExpenses,
                            total_expenses: totalExpenses,
                        };
                    }
                }

                return {
                    ...summary,
                    expenses: summaryExpenses,
                    total_expenses: totalExpenses,
                };
            })
        );

        // Calculate monthly totals
        const totalSales = Object.values(salesByDate).reduce(
            (sum, sales) => sum + sales,
            0
        );
        const totalOrders = orders?.length || 0;
        const totalCups = Object.values(productBreakdown).reduce(
            (monthTotal, dayBreakdown) =>
                monthTotal +
                Object.values(dayBreakdown).reduce(
                    (dayTotal, product) => dayTotal + product.quantity,
                    0
                ),
            0
        );

        // Convert to camelCase
        const camelSummaries = toCamelKeys(updatedSummaries);
        const camelExpensesByDate = toCamelKeys(expensesByDate);

        // Validate response
        const response = {
            summaries: camelSummaries,
            productBreakdown,
            ordersByDate,
            expensesByDate: camelExpensesByDate,
            monthlyTotals: {
                totalSales,
                totalOrders,
                totalCups,
                totalExpenses: totalMonthlyExpenses,
            },
        };

        const parsed = DailySummaryListResponse.safeParse(response);
        if (!parsed.success) {
            console.error(
                "Daily summaries response validation failed:",
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

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST /api/summaries
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateDailySummaryInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { storeId, sellerId, managerId, date, openingBalance } =
            result.data;

        // Verify store exists and belongs to current tenant
        const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, tenant_id")
            .eq("id", storeId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (storeError || !store) {
            return NextResponse.json(
                { error: "Store not found or access denied" },
                { status: 404 }
            );
        }

        // Check if summary already exists for this store & date
        const { count, error: existsError } = await supabase
            .from("daily_summaries")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("date", date)
            .eq("tenant_id", currentTenantId);

        if (existsError) {
            return NextResponse.json(
                { error: existsError.message },
                { status: 400 }
            );
        }

        if ((count ?? 0) > 0) {
            return NextResponse.json(
                { error: "Daily summary already exists for this date" },
                { status: 409 }
            );
        }

        // Get existing orders for this date
        const { data: existingOrders, error: ordersError } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            .eq("tenant_id", currentTenantId)
            .gte("created_at", `${date}T00:00:00Z`)
            .lte("created_at", `${date}T23:59:59Z`);

        if (ordersError) {
            return NextResponse.json(
                { error: ordersError.message },
                { status: 400 }
            );
        }

        const totalSales =
            existingOrders?.reduce(
                (sum, order) => sum + order.total_amount,
                0
            ) || 0;

        const opening = openingBalance || 0;
        const expectedCash = opening + totalSales;

        // Insert summary with tenant_id inherited from store
        const summaryPayload = toSnakeKeys({
            storeId,
            sellerId,
            managerId: managerId || null,
            date,
            openingBalance: opening,
            totalSales,
            expectedCash,
            tenantId: store.tenant_id,
        });

        const { data: summaryData, error: summaryError } = await supabase
            .from("daily_summaries")
            .insert(summaryPayload)
            .select()
            .single();

        if (summaryError || !summaryData) {
            return NextResponse.json(
                {
                    error:
                        summaryError?.message || "Daily summary insert failed",
                },
                { status: 400 }
            );
        }

        // Validate response
        const camelSummary = toCamelKeys(summaryData);
        const parsed = CreateDailySummaryResponse.safeParse(camelSummary);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// ============================================================================
// PUT /api/summaries
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = UpdateDailySummaryInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { id, openingBalance, actualCash, notes, closedAt } = result.data;

        // Build update payload
        const updates: Record<string, unknown> = {};
        if (openingBalance !== undefined)
            updates.opening_balance = openingBalance;
        if (actualCash !== undefined) updates.actual_cash = actualCash;
        if (notes !== undefined) updates.notes = notes;
        if (closedAt !== undefined) updates.closed_at = closedAt;

        // If updating opening_balance, recalculate expected_cash
        if (openingBalance !== undefined) {
            const { data: currentSummary, error: summaryError } = await supabase
                .from("daily_summaries")
                .select("total_sales")
                .eq("id", id)
                .eq("tenant_id", currentTenantId)
                .single();

            if (summaryError || !currentSummary) {
                return NextResponse.json(
                    { error: "Daily summary not found" },
                    { status: 404 }
                );
            }

            // Get total expenses for this summary
            const { data: expenses, error: expensesError } = await supabase
                .from("expenses")
                .select("amount")
                .eq("daily_summary_id", id)
                .eq("tenant_id", currentTenantId);

            if (expensesError) {
                return NextResponse.json(
                    { error: expensesError.message },
                    { status: 400 }
                );
            }

            const totalExpenses =
                expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

            updates.expected_cash =
                openingBalance + currentSummary.total_sales - totalExpenses;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        const { data: summaryData, error: updateError } = await supabase
            .from("daily_summaries")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (updateError || !summaryData) {
            return NextResponse.json(
                { error: updateError?.message || "Daily summary not found" },
                { status: 404 }
            );
        }

        // Validate response
        const camelSummary = toCamelKeys(summaryData);
        const parsed = UpdateDailySummaryResponse.safeParse(camelSummary);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
