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

async function adjustSummaryExpenses(
    supabase: SupabaseClient,
    dailySummaryId: string,
    tenantId: string,
    delta: number,
) {
    const { data: summary } = await supabase
        .from("store_daily_summaries")
        .select("id, total_expenses, expected_cash")
        .eq("id", dailySummaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (!summary) return;

    await supabase
        .from("store_daily_summaries")
        .update({
            total_expenses: summary.total_expenses + delta,
            expected_cash: summary.expected_cash - delta,
        })
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
        .select("id, tenant_id, total_expenses, expected_cash")
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

    await supabase
        .from("store_daily_summaries")
        .update({
            total_expenses: summary.total_expenses + amount,
            expected_cash: summary.expected_cash - amount,
        })
        .eq("id", dailySummaryId)
        .eq("tenant_id", tenantId);

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

    const { data: oldExpense, error: fetchError } = await supabase
        .from("store_expenses")
        .select("amount, daily_summary_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (fetchError || !oldExpense) throw new Error("Expense not found");

    const { data: expenseData, error } = await supabase
        .from("store_expenses")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !expenseData) throw new Error(error?.message ?? "Expense update failed");

    if (amount !== undefined) {
        const delta = amount - (oldExpense.amount as number);
        await adjustSummaryExpenses(supabase, oldExpense.daily_summary_id as string, tenantId, delta);
    }

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

    await adjustSummaryExpenses(supabase, expense.daily_summary_id as string, tenantId, -(expense.amount as number));

    const raw = expense as { id: string; store_id: string; amount: number; type: string };
    createLogger(supabase, { tenantId, userId, storeId: raw.store_id })("expense_deleted", {
        refId: raw.id,
        refTable: "store_expenses",
        metadata: { amount: raw.amount, type: raw.type },
    });

    return toCamelKeys(expense);
}
