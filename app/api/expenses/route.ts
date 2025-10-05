// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// // import { Expense } from "@/lib/hooks/useSummaries";

// import { Tables } from "@/lib/db.types";
// type Expense = Tables<"expenses">;

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);
//         const storeId = searchParams.get("storeId");
//         const month = searchParams.get("month");
//         const dailySummaryId = searchParams.get("dailySummaryId");

//         if (dailySummaryId) {
//             // Get expenses for a specific daily summary
//             const { data, error } = await supabase
//                 .from("expenses")
//                 .select("*")
//                 .eq("daily_summary_id", dailySummaryId)
//                 .order("created_at", { ascending: true });

//             if (error) throw error;
//             return NextResponse.json({ expenses: data || [] });
//         }

//         if (!storeId || !month) {
//             return NextResponse.json(
//                 { error: "Store ID and month are required" },
//                 { status: 400 }
//             );
//         }

//         // Get expenses for a store and month
//         const startDate = `${month}-01`;
//         const endDate = new Date(month + "-01");
//         endDate.setMonth(endDate.getMonth() + 1);
//         endDate.setDate(0);
//         const endDateStr = endDate.toISOString().split("T")[0];

//         const { data, error } = await supabase
//             .from("expenses")
//             .select(
//                 `
//                 *,
//                 daily_summaries!inner(date)
//             `
//             )
//             .eq("store_id", storeId)
//             .gte("daily_summaries.date", startDate)
//             .lte("daily_summaries.date", endDateStr)
//             .order("created_at", { ascending: true });

//         if (error) throw error;

//         // Group expenses by date
//         const expensesByDate: Record<string, Expense[]> = {};
//         const totalsByType: Record<string, number> = {};

//         data?.forEach((expense) => {
//             const date = expense.daily_summaries.date;
//             if (!expensesByDate[date]) {
//                 expensesByDate[date] = [];
//             }
//             expensesByDate[date].push(expense);

//             // Track totals by type
//             if (!totalsByType[expense.expense_type]) {
//                 totalsByType[expense.expense_type] = 0;
//             }
//             totalsByType[expense.expense_type] += expense.amount;
//         });

//         const totalExpenses = Object.values(totalsByType).reduce(
//             (sum, amount) => sum + amount,
//             0
//         );

//         return NextResponse.json({
//             expensesByDate,
//             totalsByType,
//             totalExpenses,
//             expenses: data || [],
//         });
//     } catch (error) {
//         console.error("Error fetching expenses:", error);
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
//         const { dailySummaryId, storeId, expenses } = body;

//         if (!dailySummaryId || !storeId || !Array.isArray(expenses)) {
//             return NextResponse.json(
//                 { error: "Missing required fields" },
//                 { status: 400 }
//             );
//         }

//         // Prepare expense records for insertion
//         const expenseRecords = expenses.map((expense) => ({
//             daily_summary_id: dailySummaryId,
//             store_id: storeId,
//             expense_type:
//                 expense.label === "Custom"
//                     ? expense.customLabel
//                     : expense.label,
//             amount: parseInt(expense.amount, 10),
//         }));

//         // Insert all expenses
//         const { data, error } = await supabase
//             .from("expenses")
//             .insert(expenseRecords)
//             .select();

//         if (error) throw error;

//         // Calculate total expenses for this daily summary
//         const totalExpenseAmount = expenseRecords.reduce(
//             (sum, expense) => sum + expense.amount,
//             0
//         );

//         // Update the daily summary's expected_cash to account for expenses
//         const { data: currentSummary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("opening_balance, total_sales")
//             .eq("id", dailySummaryId)
//             .single();

//         if (summaryError) throw summaryError;

//         // Get existing expenses total for this summary (exclude the ones we just added)
//         const { data: existingExpenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("amount")
//             .eq("daily_summary_id", dailySummaryId);

//         if (expensesError) throw expensesError;

//         const totalAllExpenses =
//             existingExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//         // Update expected_cash = opening_balance + total_sales - total_expenses
//         const newExpectedCash =
//             currentSummary.opening_balance +
//             currentSummary.total_sales -
//             totalAllExpenses;

//         const { error: updateError } = await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", dailySummaryId);

//         if (updateError) throw updateError;

//         return NextResponse.json({
//             expenses: data,
//             totalExpenseAmount,
//             newExpectedCash,
//         });
//     } catch (error) {
//         console.error("Error creating expenses:", error);
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
//         const { id, expense_type, amount } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Expense ID is required" },
//                 { status: 400 }
//             );
//         }

//         // const updates: any = {};
//         const updates: Partial<Expense> = {};

//         if (expense_type !== undefined) updates.expense_type = expense_type;
//         if (amount !== undefined) updates.amount = parseInt(amount, 10);

//         const { data, error } = await supabase
//             .from("expenses")
//             .update(updates)
//             .eq("id", id)
//             .select()
//             .single();

//         if (error) throw error;

//         // Recalculate expected_cash for the daily summary
//         const { data: allExpenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("amount")
//             .eq("daily_summary_id", data.daily_summary_id);

//         if (expensesError) throw expensesError;

//         const totalExpenses =
//             allExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//         const { data: currentSummary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("opening_balance, total_sales")
//             .eq("id", data.daily_summary_id)
//             .single();

//         if (summaryError) throw summaryError;

//         const newExpectedCash =
//             currentSummary.opening_balance +
//             currentSummary.total_sales -
//             totalExpenses;

//         const { error: updateError } = await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", data.daily_summary_id);

//         if (updateError) throw updateError;

//         return NextResponse.json(data);
//     } catch (error) {
//         console.error("Error updating expense:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function DELETE(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);
//         const id = searchParams.get("id");

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Expense ID is required" },
//                 { status: 400 }
//             );
//         }

//         // Get the expense before deleting to recalculate summary
//         const { data: expense, error: getError } = await supabase
//             .from("expenses")
//             .select("daily_summary_id, amount")
//             .eq("id", id)
//             .single();

//         if (getError) throw getError;

//         const { error } = await supabase.from("expenses").delete().eq("id", id);

//         if (error) throw error;

//         // Recalculate expected_cash for the daily summary
//         const { data: remainingExpenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("amount")
//             .eq("daily_summary_id", expense.daily_summary_id);

//         if (expensesError) throw expensesError;

//         const totalExpenses =
//             remainingExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//         const { data: currentSummary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("opening_balance, total_sales")
//             .eq("id", expense.daily_summary_id)
//             .single();

//         if (summaryError) throw summaryError;

//         const newExpectedCash =
//             currentSummary.opening_balance +
//             currentSummary.total_sales -
//             totalExpenses;

//         const { error: updateError } = await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", expense.daily_summary_id);

//         if (updateError) throw updateError;

//         return NextResponse.json({ success: true });
//     } catch (error) {
//         console.error("Error deleting expense:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// //app/api/expenses/route.ts
// import { NextRequest, NextResponse } from "next/server";
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { validateTenantId, getCurrentTenantId } from "@/lib/tenant";
// import { Tables } from "@/lib/db.types";

// type Expense = Tables<"expenses">;

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const { searchParams } = new URL(request.url);
//         const storeId = searchParams.get("storeId");
//         const month = searchParams.get("month");
//         const dailySummaryId = searchParams.get("dailySummaryId");

//         if (dailySummaryId) {
//             const { data, error } = await supabase
//                 .from("expenses")
//                 .select("*")
//                 .eq("daily_summary_id", dailySummaryId)
//                 .eq("tenant_id", currentTenantId) // 🔒 tenant filter
//                 .order("created_at", { ascending: true });

//             if (error) throw error;
//             return NextResponse.json({ expenses: data || [] });
//         }

//         if (!storeId || !month) {
//             return NextResponse.json(
//                 { error: "Store ID and month are required" },
//                 { status: 400 }
//             );
//         }

//         const startDate = `${month}-01`;
//         const endDate = new Date(month + "-01");
//         endDate.setMonth(endDate.getMonth() + 1);
//         endDate.setDate(0);
//         const endDateStr = endDate.toISOString().split("T")[0];

//         const { data, error } = await supabase
//             .from("expenses")
//             .select(
//                 `
//                 *,
//                 daily_summaries!inner(date)
//             `
//             )
//             .eq("store_id", storeId)
//             .eq("tenant_id", currentTenantId) // 🔒 tenant filter
//             .gte("daily_summaries.date", startDate)
//             .lte("daily_summaries.date", endDateStr)
//             .order("created_at", { ascending: true });

//         if (error) throw error;

//         const expensesByDate: Record<string, Expense[]> = {};
//         const totalsByType: Record<string, number> = {};

//         data?.forEach((expense) => {
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             const date = (expense as any).daily_summaries.date;
//             if (!expensesByDate[date]) {
//                 expensesByDate[date] = [];
//             }
//             expensesByDate[date].push(expense);

//             if (!totalsByType[expense.expense_type]) {
//                 totalsByType[expense.expense_type] = 0;
//             }
//             totalsByType[expense.expense_type] += expense.amount;
//         });

//         const totalExpenses = Object.values(totalsByType).reduce(
//             (sum, amount) => sum + amount,
//             0
//         );

//         return NextResponse.json({
//             expensesByDate,
//             totalsByType,
//             totalExpenses,
//             expenses: data || [],
//         });
//     } catch (error) {
//         console.error("Error fetching expenses:", error);
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
//         const { dailySummaryId, storeId, expenses } = body;

//         if (!dailySummaryId || !storeId || !Array.isArray(expenses)) {
//             return NextResponse.json(
//                 { error: "Missing required fields" },
//                 { status: 400 }
//             );
//         }

//         // 🔹 Get tenant_id from parent daily_summary
//         const { data: summary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("tenant_id, opening_balance, total_sales")
//             .eq("id", dailySummaryId)
//             .single();

//         if (summaryError || !summary) throw summaryError;
//         const tenantId = validateTenantId(summary.tenant_id, "expenses");

//         const expenseRecords = expenses.map((expense) => ({
//             daily_summary_id: dailySummaryId,
//             store_id: storeId,
//             tenant_id: tenantId, // 🔒 inherited tenant
//             expense_type:
//                 expense.label === "Custom"
//                     ? expense.customLabel
//                     : expense.label,
//             amount: parseInt(expense.amount, 10),
//         }));

//         const { data, error } = await supabase
//             .from("expenses")
//             .insert(expenseRecords)
//             .select();

//         if (error) throw error;

//         const totalAllExpenses = (data || []).reduce(
//             (sum, exp) => sum + exp.amount,
//             0
//         );

//         const newExpectedCash =
//             summary.opening_balance + summary.total_sales - totalAllExpenses;

//         await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", dailySummaryId)
//             .eq("tenant_id", tenantId);

//         return NextResponse.json({
//             expenses: data,
//             totalExpenseAmount: totalAllExpenses,
//             newExpectedCash,
//         });
//     } catch (error) {
//         console.error("Error creating expenses:", error);
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
//         const { id, expense_type, amount } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Expense ID is required" },
//                 { status: 400 }
//             );
//         }

//         const updates: Partial<Expense> = {};
//         if (expense_type !== undefined) updates.expense_type = expense_type;
//         if (amount !== undefined) updates.amount = parseInt(amount, 10);

//         const { data, error } = await supabase
//             .from("expenses")
//             .update(updates)
//             .eq("id", id)
//             .eq("tenant_id", currentTenantId) // 🔒 tenant filter
//             .select()
//             .single();

//         if (error) throw error;

//         // recalc summary
//         const { data: allExpenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("amount")
//             .eq("daily_summary_id", data.daily_summary_id)
//             .eq("tenant_id", currentTenantId);

//         if (expensesError) throw expensesError;

//         const totalExpenses =
//             allExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//         const { data: currentSummary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("opening_balance, total_sales")
//             .eq("id", data.daily_summary_id)
//             .eq("tenant_id", currentTenantId)
//             .single();

//         if (summaryError) throw summaryError;

//         const newExpectedCash =
//             currentSummary.opening_balance +
//             currentSummary.total_sales -
//             totalExpenses;

//         await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", data.daily_summary_id)
//             .eq("tenant_id", currentTenantId);

//         return NextResponse.json(data);
//     } catch (error) {
//         console.error("Error updating expense:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function DELETE(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const { searchParams } = new URL(request.url);
//         const id = searchParams.get("id");

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Expense ID is required" },
//                 { status: 400 }
//             );
//         }

//         const { data: expense, error: getError } = await supabase
//             .from("expenses")
//             .select("daily_summary_id, amount, tenant_id")
//             .eq("id", id)
//             .eq("tenant_id", currentTenantId) // 🔒 tenant filter
//             .single();

//         if (getError || !expense) throw getError;

//         await supabase
//             .from("expenses")
//             .delete()
//             .eq("id", id)
//             .eq("tenant_id", currentTenantId);

//         const { data: remainingExpenses, error: expensesError } = await supabase
//             .from("expenses")
//             .select("amount")
//             .eq("daily_summary_id", expense.daily_summary_id)
//             .eq("tenant_id", currentTenantId);

//         if (expensesError) throw expensesError;

//         const totalExpenses =
//             remainingExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

//         const { data: currentSummary, error: summaryError } = await supabase
//             .from("daily_summaries")
//             .select("opening_balance, total_sales")
//             .eq("id", expense.daily_summary_id)
//             .eq("tenant_id", currentTenantId)
//             .single();

//         if (summaryError) throw summaryError;

//         const newExpectedCash =
//             currentSummary.opening_balance +
//             currentSummary.total_sales -
//             totalExpenses;

//         await supabase
//             .from("daily_summaries")
//             .update({ expected_cash: newExpectedCash })
//             .eq("id", expense.daily_summary_id)
//             .eq("tenant_id", currentTenantId);

//         return NextResponse.json({ success: true });
//     } catch (error) {
//         console.error("Error deleting expense:", error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// app/api/expenses/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateExpenseInput,
    UpdateExpenseInput,
    ListExpensesQuery,
    ExpenseListResponse,
    CreateExpenseResponse,
    UpdateExpenseResponse,
    DeleteExpenseResponse,
} from "@/lib/schemas/expenses";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/expenses
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListExpensesQuery.safeParse(
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
                { status: 400 }
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
                { status: 404 }
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
                { status: 404 }
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
                { status: 400 }
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
                { status: 400 }
            );
        }

        const totalExpenses =
            allExpenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        const newExpectedCash =
            summary.opening_balance + summary.total_sales - totalExpenses;

        await supabase
            .from("daily_summaries")
            .update({ expected_cash: newExpectedCash })
            .eq("id", dailySummaryId)
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
                { status: 400 }
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
                { status: 400 }
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
                { status: 404 }
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
                { status: 400 }
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
                { status: 404 }
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
                { status: 400 }
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
                { status: 404 }
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
                { status: 400 }
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
                { status: 400 }
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
                { status: 404 }
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
