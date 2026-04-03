// // app/api/summaries/route.ts
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

const TZ_OFFSET_HOURS = 7; // WIB (UTC+7)

function toLocalDateStr(utcDateStr: string): string {
    const utcDate = new Date(utcDateStr);
    return new Date(utcDate.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
}

function getTodayLocalDateStr(): string {
    return toLocalDateStr(new Date().toISOString());
}

// ============================================================================
// HELPER: Fetch today's orders live (only used for the open/current day)
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTodayOrders(
    supabase: any,
    storeId: string,
    tenantId: string,
    todayStr: string,
) {
    const { data, error } = await supabase
        .from("orders")
        .select(
            `
            id,
            total_amount,
            created_at,
            order_items(
                quantity,
                total_price,
                products(name)
            )
        `,
        )
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("created_at", `${todayStr}T00:00:00Z`)
        .lte("created_at", `${todayStr}T23:59:59Z`)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
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

        const { storeId, month } = queryResult.data;
        if (!storeId || !month) {
            return NextResponse.json(
                { error: "Store ID and month are required" },
                { status: 400 },
            );
        }

        // ─── Date range ────────────────────────────────────────────────
        const startDate = `${month}-01`;
        const endDate = new Date(`${month}-01`);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        const endDateStr = endDate.toISOString().split("T")[0];
        const todayStr = getTodayLocalDateStr();

        // ─── Fetch summaries (flat, no order joins) ────────────────────
        const { data: summaries, error: summariesError } = await supabase
            .from("daily_summaries")
            .select(
                `
                *,
                stores(name),
                manager:profiles!daily_summaries_manager_id_fkey(full_name),
                seller:profiles!daily_summaries_seller_id_fkey(full_name)
            `,
            )
            .eq("store_id", storeId)
            .eq("tenant_id", currentTenantId)
            .gte("date", startDate)
            .lte("date", endDateStr)
            .order("date", { ascending: false });

        if (summariesError) {
            return NextResponse.json(
                { error: summariesError.message },
                { status: 400 },
            );
        }

        const summaryList = summaries ?? [];

        // ─── Fetch expenses for all summaries ──────────────────────────
        const summaryIds = summaryList.map((s) => s.id);
        const expensesByDate: Record<string, any[]> = {};
        const expensesBySummaryId: Record<string, any[]> = {};

        if (summaryIds.length > 0) {
            const { data: expenses, error: expensesError } = await supabase
                .from("expenses")
                .select("*")
                .in("daily_summary_id", summaryIds)
                .eq("tenant_id", currentTenantId);

            if (expensesError) {
                return NextResponse.json(
                    { error: expensesError.message },
                    { status: 400 },
                );
            }

            expenses?.forEach((expense) => {
                if (!expensesBySummaryId[expense.daily_summary_id]) {
                    expensesBySummaryId[expense.daily_summary_id] = [];
                }
                expensesBySummaryId[expense.daily_summary_id].push(expense);

                const summary = summaryList.find(
                    (s) => s.id === expense.daily_summary_id,
                );
                if (summary) {
                    if (!expensesByDate[summary.date])
                        expensesByDate[summary.date] = [];
                    expensesByDate[summary.date].push(expense);
                }
            });
        }

        // ─── Live fetch for today only ─────────────────────────────────
        const todaySummary = summaryList.find(
            (s) => s.date === todayStr && !s.closed_at,
        );
        let productBreakdown: Record<
            string,
            Record<string, { quantity: number; revenue: number }>
        > = {};
        let todayLiveSales = 0;
        let todayLiveOrders = 0;
        let todayLiveCups = 0;

        if (todaySummary) {
            const todayOrders = await fetchTodayOrders(
                supabase,
                storeId,
                currentTenantId,
                todayStr,
            );

            todayOrders.forEach((order: any) => {
                todayLiveSales += order.total_amount;
                todayLiveOrders += 1;

                productBreakdown[todayStr] ??= {};
                order.order_items?.forEach((item: any) => {
                    const name = item.products?.name ?? "Unknown Product";
                    productBreakdown[todayStr][name] ??= {
                        quantity: 0,
                        revenue: 0,
                    };
                    productBreakdown[todayStr][name].quantity += item.quantity;
                    productBreakdown[todayStr][name].revenue +=
                        item.total_price;
                    todayLiveCups += item.quantity;
                });
            });

            // Update today's summary in DB if sales have changed — only for open day
            const todayExpenses = expensesBySummaryId[todaySummary.id] ?? [];
            const todayTotalExpenses = todayExpenses.reduce(
                (sum: number, e: any) => sum + e.amount,
                0,
            );
            const newExpectedCash =
                todaySummary.opening_balance +
                todayLiveSales -
                todayTotalExpenses;

            if (
                todayLiveSales !== todaySummary.total_sales ||
                newExpectedCash !== todaySummary.expected_cash ||
                todayLiveOrders !== todaySummary.total_orders ||
                todayLiveCups !== todaySummary.total_cups ||
                todayTotalExpenses !== todaySummary.total_expenses
            ) {
                await supabase
                    .from("daily_summaries")
                    .update({
                        total_sales: todayLiveSales,
                        total_orders: todayLiveOrders,
                        total_cups: todayLiveCups,
                        total_expenses: todayTotalExpenses,
                        expected_cash: newExpectedCash,
                    })
                    .eq("id", todaySummary.id)
                    .eq("tenant_id", currentTenantId);

                // Patch in-memory so response is accurate without a re-fetch
                todaySummary.total_sales = todayLiveSales;
                todaySummary.total_orders = todayLiveOrders;
                todaySummary.total_cups = todayLiveCups;
                todaySummary.total_expenses = todayTotalExpenses;
                todaySummary.expected_cash = newExpectedCash;
            }
        }

        // ─── Build final summaries with expenses attached ──────────────
        const finalSummaries = summaryList.map((summary) => ({
            ...summary,
            expenses: expensesBySummaryId[summary.id] ?? [],
        }));

        // ─── Monthly totals — sum from precomputed rows ────────────────
        const monthlyTotals = summaryList.reduce(
            (acc, s) => ({
                totalSales: acc.totalSales + (s.total_sales ?? 0),
                totalOrders: acc.totalOrders + (s.total_orders ?? 0),
                totalCups: acc.totalCups + (s.total_cups ?? 0),
                totalExpenses: acc.totalExpenses + (s.total_expenses ?? 0),
            }),
            { totalSales: 0, totalOrders: 0, totalCups: 0, totalExpenses: 0 },
        );

        // ─── Build and validate response ───────────────────────────────
        const camelSummaries = toCamelKeys(finalSummaries);
        const camelExpensesByDate = toCamelKeys(expensesByDate);

        const response = {
            summaries: camelSummaries,
            productBreakdown,
            expensesByDate: camelExpensesByDate,
            monthlyTotals,
        };

        const parsed = DailySummaryListResponse.safeParse(response);
        if (!parsed.success) {
            console.error(
                "[GET /api/summaries] Validation failed:",
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

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[GET /api/summaries]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
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
                { status: 400 },
            );
        }

        const { storeId, sellerId, managerId, date, openingBalance } =
            result.data;

        // Verify store belongs to tenant
        const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, tenant_id")
            .eq("id", storeId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (storeError || !store) {
            return NextResponse.json(
                { error: "Store not found or access denied" },
                { status: 404 },
            );
        }

        // Check for duplicate
        const { count, error: existsError } = await supabase
            .from("daily_summaries")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .eq("date", date)
            .eq("tenant_id", currentTenantId);

        if (existsError) {
            return NextResponse.json(
                { error: existsError.message },
                { status: 400 },
            );
        }
        if ((count ?? 0) > 0) {
            return NextResponse.json(
                { error: "Daily summary already exists for this date" },
                { status: 409 },
            );
        }

        // Fetch today's orders to initialize totals
        const { data: existingOrders, error: ordersError } = await supabase
            .from("orders")
            .select("total_amount, order_items(quantity)")
            .eq("store_id", storeId)
            .eq("tenant_id", currentTenantId)
            .gte("created_at", `${date}T00:00:00Z`)
            .lte("created_at", `${date}T23:59:59Z`);

        if (ordersError) {
            return NextResponse.json(
                { error: ordersError.message },
                { status: 400 },
            );
        }

        const totalSales =
            existingOrders?.reduce((sum, o) => sum + o.total_amount, 0) ?? 0;
        const totalOrders = existingOrders?.length ?? 0;
        const totalCups =
            existingOrders?.reduce(
                (sum, o) =>
                    sum +
                    (o.order_items?.reduce(
                        (s: number, i: any) => s + i.quantity,
                        0,
                    ) ?? 0),
                0,
            ) ?? 0;
        const opening = openingBalance ?? 0;

        const summaryPayload = toSnakeKeys({
            storeId,
            sellerId,
            managerId: managerId ?? null,
            date,
            openingBalance: opening,
            totalSales,
            totalOrders,
            totalCups,
            totalExpenses: 0,
            expectedCash: opening + totalSales,
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
                        summaryError?.message ?? "Daily summary insert failed",
                },
                { status: 400 },
            );
        }

        const camelSummary = toCamelKeys(summaryData);
        const parsed = CreateDailySummaryResponse.safeParse(camelSummary);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error("[POST /api/summaries]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
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
                { status: 400 },
            );
        }

        const { id, openingBalance, actualCash, notes, closedAt } = result.data;

        // Fetch current summary once — used for variance + expectedCash recalc
        const { data: currentSummary, error: fetchError } = await supabase
            .from("daily_summaries")
            .select(
                "expected_cash, total_sales, total_expenses, total_orders, total_cups, closed_at",
            )
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (fetchError || !currentSummary) {
            return NextResponse.json(
                { error: "Daily summary not found" },
                { status: 404 },
            );
        }

        const updates: Record<string, unknown> = {};
        if (openingBalance !== undefined)
            updates.opening_balance = openingBalance;
        if (actualCash !== undefined) updates.actual_cash = actualCash;
        if (notes !== undefined) updates.notes = notes;
        if (closedAt !== undefined) updates.closed_at = closedAt;

        // Recalculate variance if actualCash provided
        if (actualCash !== null && actualCash !== undefined) {
            updates.variance = actualCash - currentSummary.expected_cash;
        }

        // Recalculate expected_cash if opening balance changed
        if (openingBalance !== undefined) {
            updates.expected_cash =
                openingBalance +
                currentSummary.total_sales -
                currentSummary.total_expenses;
        }

        // ── Lock in final totals on close ──────────────────────────────
        // If this is a closeDay call, fetch live orders one last time and
        // permanently write total_orders, total_cups, total_sales into the row.
        if (closedAt && !currentSummary.closed_at) {
            const summaryRow = await supabase
                .from("daily_summaries")
                .select("date, store_id, tenant_id, opening_balance")
                .eq("id", id)
                .eq("tenant_id", currentTenantId)
                .single();

            if (summaryRow.data) {
                const { date, store_id, opening_balance } = summaryRow.data;

                const liveOrders = await fetchTodayOrders(
                    supabase,
                    store_id,
                    currentTenantId,
                    date,
                );

                const finalSales = liveOrders.reduce(
                    (sum: number, o: any) => sum + o.total_amount,
                    0,
                );
                const finalOrders = liveOrders.length;
                const finalCups = liveOrders.reduce(
                    (sum: number, o: any) =>
                        sum +
                        (o.order_items?.reduce(
                            (s: number, i: any) => s + i.quantity,
                            0,
                        ) ?? 0),
                    0,
                );

                // Get final expenses
                const { data: expenseRows } = await supabase
                    .from("expenses")
                    .select("amount")
                    .eq("daily_summary_id", id)
                    .eq("tenant_id", currentTenantId);

                const finalExpenses =
                    expenseRows?.reduce(
                        (sum: number, e: any) => sum + e.amount,
                        0,
                    ) ?? 0;
                const finalExpectedCash =
                    opening_balance + finalSales - finalExpenses;

                updates.total_sales = finalSales;
                updates.total_orders = finalOrders;
                updates.total_cups = finalCups;
                updates.total_expenses = finalExpenses;
                updates.expected_cash = finalExpectedCash;

                // Recalculate variance with final expected cash
                if (actualCash !== null && actualCash !== undefined) {
                    updates.variance = actualCash - finalExpectedCash;
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 },
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
                { error: updateError?.message ?? "Daily summary not found" },
                { status: 404 },
            );
        }

        const camelSummary = toCamelKeys(summaryData);
        const parsed = UpdateDailySummaryResponse.safeParse(camelSummary);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[PUT /api/summaries]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
