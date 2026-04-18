// app/api/expenses/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateExpenseInput,
    UpdateExpenseInput,
    ListExpensesQuery,
    ExpenseListResponse,
    CreateExpenseResponse,
    UpdateExpenseResponse,
    DeleteExpenseResponse,
} from "@/lib/shared/schemas/expenses";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// GET /api/expenses
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListExpensesQuery.safeParse(
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

        const { dailySummaryId, storeId } = queryResult.data;

        let query = supabase
            .from("expenses")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .order("created_at", { ascending: true });

        if (dailySummaryId) {
            query = query.eq("daily_summary_id", dailySummaryId);
        }

        if (storeId) {
            query = query.eq("store_id", storeId);
        }

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = ExpenseListResponse.safeParse({ expenses: camelData });
        if (!parsed.success) {
            console.error("Expenses response validation failed:", parsed.error);
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/expenses
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateExpenseInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { dailySummaryId, storeId, expenseType, amount } = result.data;

        // Verify daily_summary exists and belongs to current tenant
        const { data: summary, error: summaryError } = await supabase
            .from("daily_summaries")
            .select("id, tenant_id, opening_balance, total_sales")
            .eq("id", dailySummaryId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (summaryError || !summary) {
            return NextResponse.json(
                { error: "Daily summary not found or access denied" },
                { status: 404 },
            );
        }

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
                { status: 404 },
            );
        }

        // Insert expense with tenant_id inherited from daily_summary
        const expensePayload = toSnakeKeys({
            dailySummaryId,
            storeId,
            expenseType,
            amount,
            tenantId: summary.tenant_id,
        });

        const { data: expenseData, error: expenseError } = await supabase
            .from("expenses")
            .insert(expensePayload)
            .select()
            .single();

        if (expenseError || !expenseData) {
            return NextResponse.json(
                { error: expenseError?.message || "Expense insert failed" },
                { status: 400 },
            );
        }

        // Recalculate expected_cash for the daily_summary
        const { data: allExpenses, error: expensesError } = await supabase
            .from("expenses")
            .select("amount")
            .eq("daily_summary_id", dailySummaryId)
            .eq("tenant_id", currentTenantId);

        if (expensesError) {
            return NextResponse.json(
                { error: expensesError.message },
                { status: 400 },
            );
        }

        const totalExpenses =
            allExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const newExpectedCash =
            summary.opening_balance + summary.total_sales - totalExpenses;

        await supabase
            .from("daily_summaries")
            .update({
                expected_cash: newExpectedCash,
                total_expenses: totalExpenses, // ← add this line
            })
            .eq("id", dailySummaryId) // or expense.daily_summary_id for PUT/DELETE
            .eq("tenant_id", currentTenantId);

        // Validate response
        const camelExpense = toCamelKeys(expenseData);
        const response = { success: true, expense: camelExpense };
        const parsed = CreateExpenseResponse.safeParse(response);
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// PUT /api/expenses
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = UpdateExpenseInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { id, expenseType, amount } = result.data;

        // Build update payload (only include provided fields)
        const updates: Record<string, unknown> = {};
        if (expenseType !== undefined) updates.expense_type = expenseType;
        if (amount !== undefined) updates.amount = amount;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 },
            );
        }

        const { data: expenseData, error: expenseError } = await supabase
            .from("expenses")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (expenseError || !expenseData) {
            return NextResponse.json(
                { error: expenseError?.message || "Expense not found" },
                { status: 404 },
            );
        }

        // Recalculate expected_cash for the daily_summary
        const { data: allExpenses, error: expensesError } = await supabase
            .from("expenses")
            .select("amount")
            .eq("daily_summary_id", expenseData.daily_summary_id)
            .eq("tenant_id", currentTenantId);

        if (expensesError) {
            return NextResponse.json(
                { error: expensesError.message },
                { status: 400 },
            );
        }

        const totalExpenses =
            allExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

        const { data: summary, error: summaryError } = await supabase
            .from("daily_summaries")
            .select("opening_balance, total_sales")
            .eq("id", expenseData.daily_summary_id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (summaryError || !summary) {
            return NextResponse.json(
                { error: "Daily summary not found" },
                { status: 404 },
            );
        }

        const newExpectedCash =
            summary.opening_balance + summary.total_sales - totalExpenses;

        await supabase
            .from("daily_summaries")
            .update({ expected_cash: newExpectedCash })
            .eq("id", expenseData.daily_summary_id)
            .eq("tenant_id", currentTenantId);

        // Validate response
        const camelExpense = toCamelKeys(expenseData);
        const response = { success: true, expense: camelExpense };
        const parsed = UpdateExpenseResponse.safeParse(response);
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// DELETE /api/expenses
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Expense ID is required" },
                { status: 400 },
            );
        }

        // Get expense first to get daily_summary_id for recalculation
        const { data: expense, error: getError } = await supabase
            .from("expenses")
            .select("*")
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (getError || !expense) {
            return NextResponse.json(
                { error: "Expense not found" },
                { status: 404 },
            );
        }

        // Delete expense
        const { error: deleteError } = await supabase
            .from("expenses")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId);

        if (deleteError) {
            return NextResponse.json(
                { error: deleteError.message },
                { status: 400 },
            );
        }

        // Recalculate expected_cash for the daily_summary
        const { data: remainingExpenses, error: expensesError } = await supabase
            .from("expenses")
            .select("amount")
            .eq("daily_summary_id", expense.daily_summary_id)
            .eq("tenant_id", currentTenantId);

        if (expensesError) {
            return NextResponse.json(
                { error: expensesError.message },
                { status: 400 },
            );
        }

        const totalExpenses =
            remainingExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

        const { data: summary, error: summaryError } = await supabase
            .from("daily_summaries")
            .select("opening_balance, total_sales")
            .eq("id", expense.daily_summary_id)
            .eq("tenant_id", currentTenantId)
            .single();

        if (summaryError || !summary) {
            return NextResponse.json(
                { error: "Daily summary not found" },
                { status: 404 },
            );
        }

        const newExpectedCash =
            summary.opening_balance + summary.total_sales - totalExpenses;

        await supabase
            .from("daily_summaries")
            .update({ expected_cash: newExpectedCash })
            .eq("id", expense.daily_summary_id)
            .eq("tenant_id", currentTenantId);

        // Validate response
        const camelExpense = toCamelKeys(expense);
        const response = { success: true, expense: camelExpense };
        const parsed = DeleteExpenseResponse.safeParse(response);
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
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
