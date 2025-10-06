// dashboard/analytics/hooks/useAnalyticsActions.ts
import { createClient } from "@/lib/supabase/client";

export const useAnalyticsActions = () => {
    const supabase = createClient();

    const calculateTotalSales = async (storeId: string, date: string) => {
        const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("store_id", storeId)
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${date}T23:59:59`);

        return orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    };

    const createSummary = async (summaryData: {
        storeId: string;
        sellerId: string;
        managerId: string;
        date: string;
        openingBalance: number;
    }) => {
        // Check if summary already exists for this store/date
        const { data: existing } = await supabase
            .from("daily_summaries")
            .select("id")
            .eq("store_id", summaryData.storeId)
            .eq("date", summaryData.date)
            .single();

        if (existing) {
            throw new Error(
                "Daily summary already exists for this store and date"
            );
        }

        const totalSales = await calculateTotalSales(
            summaryData.storeId,
            summaryData.date
        );
        const expectedCash = summaryData.openingBalance + totalSales;

        const { error } = await supabase.from("daily_summaries").insert({
            store_id: summaryData.storeId,
            seller_id: summaryData.sellerId,
            manager_id: summaryData.managerId,
            date: summaryData.date,
            opening_balance: summaryData.openingBalance,
            total_sales: totalSales,
            expected_cash: expectedCash,
        });

        if (error) throw error;
    };

    const updateSummary = async (
        summaryId: string,
        updates: {
            opening_balance?: number;
            actual_cash?: number;
            variance?: number;
            notes?: string | null;
            closed_at?: string | null;
        }
    ) => {
        const { error } = await supabase
            .from("daily_summaries")
            .update(updates)
            .eq("id", summaryId);

        if (error) throw error;
    };

    const createExpenses = async (expensesData: {
        dailySummaryId: string;
        storeId: string;
        expenses: Array<{
            label: string;
            customLabel?: string;
            amount: string;
        }>;
    }) => {
        const expenseRecords = expensesData.expenses.map((expense) => ({
            daily_summary_id: expensesData.dailySummaryId,
            expense_type: expense.customLabel || expense.label,
            amount: parseFloat(expense.amount),
            store_id: expensesData.storeId,
        }));

        const { error } = await supabase
            .from("expenses")
            .insert(expenseRecords);

        if (error) throw error;
    };

    const refreshSales = async (
        summaryId: string,
        storeId: string,
        date: string,
        openingBalance: number
    ) => {
        const totalSales = await calculateTotalSales(storeId, date);
        const expectedCash = openingBalance + totalSales;

        const { error } = await supabase
            .from("daily_summaries")
            .update({
                total_sales: totalSales,
                expected_cash: expectedCash,
            })
            .eq("id", summaryId);

        if (error) throw error;
    };

    const closeDaySummary = async (
        summaryId: string,
        actualCash: number,
        notes: string | null
    ) => {
        // Get the current summary to calculate variance
        const { data: summary } = await supabase
            .from("daily_summaries")
            .select("expected_cash")
            .eq("id", summaryId)
            .single();

        if (!summary) throw new Error("Summary not found");

        const variance = actualCash - summary.expected_cash;

        const { error } = await supabase
            .from("daily_summaries")
            .update({
                actual_cash: actualCash,
                variance: variance,
                notes: notes || null,
                closed_at: new Date().toISOString(),
            })
            .eq("id", summaryId);

        if (error) throw error;
    };

    return {
        createSummary,
        updateSummary,
        createExpenses,
        refreshSales,
        closeDaySummary,
        calculateTotalSales,
    };
};
