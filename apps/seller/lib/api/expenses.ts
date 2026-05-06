import { apiFetch, buildParams } from "./client";
import type { ListExpensesQuery, CreateExpenseInput, UpdateExpenseInput } from "@tea-pos/features/expenses/schema";
import { ExpenseListResponse, CreateExpenseResponse, UpdateExpenseResponse, DeleteExpenseResponse } from "@tea-pos/features/expenses/schema";

export const expensesApi = {
    list: async (params: Partial<ListExpensesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ExpenseListResponse.parse(await apiFetch<unknown>(`/api/expenses?${sp}`));
    },
    create: async (input: CreateExpenseInput) => {
        return CreateExpenseResponse.parse(await apiFetch<unknown>("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
    update: async (input: UpdateExpenseInput) => {
        return UpdateExpenseResponse.parse(await apiFetch<unknown>("/api/expenses", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
    delete: async (id: string) => {
        return DeleteExpenseResponse.parse(await apiFetch<unknown>(`/api/expenses?id=${encodeURIComponent(id)}`, {
            method: "DELETE",
        }));
    },
};
