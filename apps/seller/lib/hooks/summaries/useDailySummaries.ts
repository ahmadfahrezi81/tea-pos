//lib/hooks/summaries/useDailySummaries.ts
import useSWR from "swr";
import { summariesApi } from "@/lib/api/summaries";
import { expensesApi } from "@/lib/api/expenses";
import type { DailySummaryListResponse, CreateDailySummaryInput, UpdateDailySummaryInput } from "@tea-pos/features/summaries/schema";
import type { CreateExpenseInput, UpdateExpenseInput } from "@tea-pos/features/expenses/schema";

export const useSummaries = (storeId?: string, month?: string) => {
    const key = storeId && month ? `summaries-${storeId}-${month}` : null;

    const { data, error, mutate } = useSWR<DailySummaryListResponse>(
        key,
        () => summariesApi.list({ storeId, month }),
        {
            revalidateOnFocus: true,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 5_000,
        },
    );

    const processedData = data
        ? {
              ...data,
              summaries: data.summaries.map((summary) => ({
                  ...summary,
                  expenses:
                      summary.expenses ??
                      data.expensesByDate?.[summary.date] ??
                      [],
              })),
          }
        : undefined;

    // ─── Mutations ─────────────────────────────────────────────────────────

    const createSummary = async (summaryData: Omit<CreateDailySummaryInput, "tenantId">) => {
        const result = await summariesApi.create(summaryData as CreateDailySummaryInput);
        await mutate();
        return result;
    };

    const updateSummary = async (
        id: string,
        updates: Omit<Partial<UpdateDailySummaryInput>, "id">,
    ) => {
        const result = await summariesApi.update({ id, ...updates } as UpdateDailySummaryInput);
        await mutate();
        return result;
    };

    const createExpenses = async (expenseData: {
        dailySummaryId: string;
        storeId: string;
        expenses: Array<{ label: string; customLabel?: string; amount: string }>;
    }) => {
        const payloads = expenseData.expenses.map((expense) => ({
            dailySummaryId: expenseData.dailySummaryId,
            storeId: expenseData.storeId,
            type:
                expense.label === "Custom"
                    ? (expense.customLabel ?? "Other")
                    : expense.label,
            amount: parseFloat(expense.amount),
        }));

        await Promise.all(
            payloads.map((payload) => expensesApi.create(payload as CreateExpenseInput)),
        );

        await mutate();
        return { success: true };
    };

    const updateExpense = async (
        id: string,
        updates: { type?: string; amount?: number },
    ) => {
        const result = await expensesApi.update({ id, ...updates } as UpdateExpenseInput);
        await mutate();
        return result;
    };

    const deleteExpense = async (id: string) => {
        const result = await expensesApi.delete(id);
        await mutate();
        return result;
    };

    return {
        data: processedData,
        isLoading: !data && !error,
        error,
        mutate,
        createSummary,
        updateSummary,
        createExpenses,
        updateExpense,
        deleteExpense,
    };
};
