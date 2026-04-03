//lib/hooks/summaries/useDailySummaries.ts
import useSWR from "swr";
import {
    DailySummaryListResponse,
    CreateDailySummaryInput,
    UpdateDailySummaryInput,
} from "@/lib/schemas/daily-summaries";
import { CreateExpenseInput } from "@/lib/schemas/expenses";

const fetchSummaries = async (
    url: string,
): Promise<DailySummaryListResponse> => {
    const res = await fetch(url);
    if (!res.ok) {
        let errMsg = `Failed to fetch summaries: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    const parsed = DailySummaryListResponse.safeParse(json);
    if (!parsed.success) {
        console.error(
            "[useSummaries] Invalid response:",
            parsed.error.format(),
        );
        throw new Error("Invalid summaries response shape");
    }

    return parsed.data;
};

export const useSummaries = (storeId?: string, month?: string) => {
    // Use URL as SWR key — unambiguous and passes directly to fetcher
    const key =
        storeId && month
            ? `/api/summaries?storeId=${storeId}&month=${month}`
            : null;

    const { data, error, mutate } = useSWR<DailySummaryListResponse>(
        key,
        fetchSummaries,
        {
            revalidateOnFocus: true,
            revalidateOnMount: true,
            revalidateIfStale: false,
            dedupingInterval: 5_000,
        },
    );

    // Minimal processing — totals now come precomputed from the DB.
    // We only ensure expenses array is always present on each summary.
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

    const createSummary = async (
        summaryData: Omit<CreateDailySummaryInput, "tenantId">,
    ) => {
        const res = await fetch("/api/summaries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(summaryData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error ?? "Failed to create summary");
        }

        await mutate();
        return res.json();
    };

    const updateSummary = async (
        id: string,
        updates: Omit<Partial<UpdateDailySummaryInput>, "id">,
    ) => {
        const res = await fetch("/api/summaries", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error ?? "Failed to update summary");
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
        const payloads: Omit<CreateExpenseInput, "tenantId">[] =
            expenseData.expenses.map((expense) => ({
                dailySummaryId: expenseData.dailySummaryId,
                storeId: expenseData.storeId,
                expenseType:
                    expense.label === "Custom"
                        ? (expense.customLabel ?? "Other")
                        : expense.label,
                amount: parseFloat(expense.amount),
            }));

        const responses = await Promise.all(
            payloads.map((payload) =>
                fetch("/api/expenses", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }),
            ),
        );

        for (const res of responses) {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error ?? "Failed to create expenses");
            }
        }

        // await directly — no setTimeout race condition
        await mutate();
        return { success: true };
    };

    const updateExpense = async (
        id: string,
        updates: { expenseType?: string; amount?: number },
    ) => {
        const res = await fetch("/api/expenses", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error ?? "Failed to update expense");
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
            throw new Error(errorData.error ?? "Failed to delete expense");
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
