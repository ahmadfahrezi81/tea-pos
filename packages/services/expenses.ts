import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys, toSnakeKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListExpensesParams {
    tenantId: string;
    dailySummaryId?: string;
    storeId?: string;
}

export interface CreateExpenseParams {
    tenantId: string;
    userId: string;
    dailySummaryId: string;
    storeId: string;
    type: string;
    amount: number;
}

export interface UpdateExpenseParams {
    tenantId: string;
    userId: string;
    id: string;
    type?: string;
    amount?: number;
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function recalcSummary(supabase: SupabaseClient, dailySummaryId: string, tenantId: string) {
    const [{ data: expenses }, { data: summary }] = await Promise.all([
        supabase.from("store_expenses").select("amount").eq("daily_summary_id", dailySummaryId).eq("tenant_id", tenantId),
        supabase.from("store_daily_summaries").select("opening_balance, total_sales").eq("id", dailySummaryId).eq("tenant_id", tenantId).single(),
    ]);

    if (!summary) return;

    const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);
    const expectedCash = summary.opening_balance + summary.total_sales - totalExpenses;

    await supabase
        .from("store_daily_summaries")
        .update({ expected_cash: expectedCash, total_expenses: totalExpenses })
        .eq("id", dailySummaryId)
        .eq("tenant_id", tenantId);
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listExpenses(supabase: SupabaseClient, params: ListExpensesParams) {
    const { tenantId, dailySummaryId, storeId } = params;

    let query = supabase
        .from("store_expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

    if (dailySummaryId) query = query.eq("daily_summary_id", dailySummaryId);
    if (storeId) query = query.eq("store_id", storeId);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function createExpense(supabase: SupabaseClient, params: CreateExpenseParams) {
    const { tenantId, userId, dailySummaryId, storeId, type, amount } = params;

    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("id, tenant_id")
        .eq("id", dailySummaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (summaryError || !summary) throw new Error("Daily summary not found or access denied");

    const { error: storeError } = await supabase
        .from("stores")
        .select("id")
        .eq("id", storeId)
        .eq("tenant_id", tenantId)
        .single();

    if (storeError) throw new Error("Store not found or access denied");

    const { data: expenseData, error: expenseError } = await supabase
        .from("store_expenses")
        .insert(toSnakeKeys({ dailySummaryId, storeId, type, amount, tenantId: summary.tenant_id }))
        .select()
        .single();

    if (expenseError || !expenseData) throw new Error(expenseError?.message ?? "Expense insert failed");

    await recalcSummary(supabase, dailySummaryId, tenantId);

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("expense_created", {
        refId: (expenseData as { id: string }).id,
        refTable: "store_expenses",
        metadata: { amount, type },
    });

    return toCamelKeys(expenseData);
}

export async function updateExpense(supabase: SupabaseClient, params: UpdateExpenseParams) {
    const { tenantId, userId, id, type, amount } = params;

    const updates: Record<string, unknown> = {};
    if (type !== undefined) updates.type = type;
    if (amount !== undefined) updates.amount = amount;
    if (Object.keys(updates).length === 0) throw new Error("No fields to update");

    const { data: expenseData, error } = await supabase
        .from("store_expenses")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !expenseData) throw new Error(error?.message ?? "Expense not found");

    await recalcSummary(supabase, expenseData.daily_summary_id, tenantId);

    const raw = expenseData as { id: string; store_id: string; amount: number; type: string };
    createLogger(supabase, { tenantId, userId, storeId: raw.store_id })("expense_updated", {
        refId: raw.id,
        refTable: "store_expenses",
        metadata: { amount: raw.amount, type: raw.type },
    });

    return toCamelKeys(expenseData);
}

export async function deleteExpense(supabase: SupabaseClient, { tenantId, userId, id }: { tenantId: string; userId: string; id: string }) {
    const { data: expense, error: getError } = await supabase
        .from("store_expenses")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (getError || !expense) throw new Error("Expense not found");

    const { error: deleteError } = await supabase
        .from("store_expenses")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (deleteError) throw new Error(deleteError.message);

    await recalcSummary(supabase, expense.daily_summary_id, tenantId);

    const raw = expense as { id: string; store_id: string; amount: number; type: string };
    createLogger(supabase, { tenantId, userId, storeId: raw.store_id })("expense_deleted", {
        refId: raw.id,
        refTable: "store_expenses",
        metadata: { amount: raw.amount, type: raw.type },
    });

    return toCamelKeys(expense);
}
