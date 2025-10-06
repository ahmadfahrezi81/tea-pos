//lib/hooks/summaries/useDailySummaries.ts
import useSWR from "swr";
import {
    DailySummary,
    DailySummaryListResponse,
    CreateDailySummaryInput,
    UpdateDailySummaryInput,
} from "@/lib/schemas/daily-summaries";
import { Expense, CreateExpenseInput } from "@/lib/schemas/expenses";

interface FetchSummariesParams {
    storeId: string;
    month: string;
}

const fetchSummaries = async ({
    storeId,
    month,
}: FetchSummariesParams): Promise<DailySummaryListResponse> => {
    const params = new URLSearchParams();
    params.append("storeId", storeId);
    params.append("month", month);

    const res = await fetch(`/api/summaries?${params.toString()}`);
    if (!res.ok) {
        let errMsg = `Failed to fetch summaries: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // ✅ validate client-side (optional, since backend already validates)
    const parsed = DailySummaryListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "Invalid summaries response on client:",
            parsed.error.format()
        );
        return {
            summaries: [],
            productBreakdown: {},
            ordersByDate: {},
            expensesByDate: {},
            monthlyTotals: {
                totalSales: 0,
                totalOrders: 0,
                totalCups: 0,
                totalExpenses: 0,
            },
        };
    }

    return parsed.data;
};

export const useSummaries = (storeId?: string, month?: string) => {
    const key = storeId && month ? `summaries-${storeId}-${month}` : null;

    const { data, error, mutate } = useSWR<DailySummaryListResponse>(
        key,
        () => fetchSummaries({ storeId: storeId!, month: month! }),
        {
            revalidateOnFocus: true,
            revalidateOnMount: true,
            dedupingInterval: 5000,
        }
    );

    // Process data to ensure consistency
    const processedData = data
        ? {
              ...data,
              summaries:
                  data.summaries?.map((summary) => {
                      const expenses =
                          summary.expenses ||
                          data.expensesByDate?.[summary.date] ||
                          [];
                      const totalExpenses =
                          summary.totalExpenses ??
                          expenses.reduce((sum, exp) => sum + exp.amount, 0);

                      return {
                          ...summary,
                          expenses,
                          totalExpenses,
                          expectedCash:
                              summary.openingBalance +
                              summary.totalSales -
                              totalExpenses,
                      };
                  }) || [],
          }
        : undefined;

    const createSummary = async (
        summaryData: Omit<CreateDailySummaryInput, "tenantId">
    ) => {
        const res = await fetch("/api/summaries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(summaryData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create summary");
        }

        await mutate();
        return res.json();
    };

    const updateSummary = async (
        id: string,
        updates: Omit<Partial<UpdateDailySummaryInput>, "id">
    ) => {
        const res = await fetch("/api/summaries", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to update summary");
        }

        await mutate();
        return res.json();
    };

    const createExpenses = async (expenseData: {
        dailySummaryId: string;
        storeId: string;
        expenses: Array<{
            label: string;
            customLabel?: string;
            amount: string;
        }>;
    }) => {
        // Transform expenses array to match CreateExpenseInput schema
        const expensePromises = expenseData.expenses.map((expense) => {
            const payload: Omit<CreateExpenseInput, "tenantId"> = {
                dailySummaryId: expenseData.dailySummaryId,
                storeId: expenseData.storeId,
                expenseType:
                    expense.label === "Custom"
                        ? expense.customLabel || "Other"
                        : expense.label,
                amount: parseFloat(expense.amount),
            };

            return fetch("/api/expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
        });

        const responses = await Promise.all(expensePromises);

        // Check if any failed
        for (const res of responses) {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to create expenses");
            }
        }

        setTimeout(() => mutate(), 500);
        return { success: true };
    };

    const updateExpense = async (
        id: string,
        updates: { expenseType?: string; amount?: number }
    ) => {
        const res = await fetch("/api/expenses", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to update expense");
        }

        await mutate();
        return res.json();
    };

    const deleteExpense = async (id: string) => {
        const res = await fetch(`/api/expenses?id=${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to delete expense");
        }

        await mutate();
        return res.json();
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
