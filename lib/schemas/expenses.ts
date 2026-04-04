// lib/schemas/expenses.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateExpenseInput, UpdateExpenseInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListExpensesQuery, GetExpenseQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: ExpenseResponse, CreateExpenseResponse, ExpenseListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateExpenseInput = z
    .object({
        dailySummaryId: UUIDSchema.openapi({
            description: "ID of the daily summary this expense belongs to",
        }),
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        expenseType: z.string().min(1).max(100).openapi({
            description: "Type/category of expense",
            example: "Supplies",
        }),
        amount: z.number().min(0).openapi({
            description: "Expense amount in currency units",
            example: 50000,
        }),
        // tenantId is NOT included in input - it's inherited from daily_summary
    })
    .openapi({ title: "CreateExpenseInput" });

export const UpdateExpenseInput = z
    .object({
        id: UUIDSchema,
        expenseType: z.string().min(1).max(100).optional().openapi({
            description: "Type/category of expense",
            example: "Supplies",
        }),
        amount: z.number().min(0).optional().openapi({
            description: "Expense amount in currency units",
            example: 50000,
        }),
    })
    .openapi({ title: "UpdateExpenseInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListExpensesQuery = z
    .object({
        dailySummaryId: UUIDSchema.optional().openapi({
            description: "Filter expenses by daily summary ID",
        }),
        storeId: UUIDSchema.optional().openapi({
            description: "Filter expenses by store ID",
        }),
        // tenantId is NOT a query param - it's from the session
    })
    .openapi({ title: "ListExpensesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ExpenseResponse = z
    .object({
        id: UUIDSchema,
        dailySummaryId: UUIDSchema,
        storeId: UUIDSchema,
        expenseType: z.string(),
        amount: z.number(),
        tenantId: UUIDSchema,
        createdAt: z.string(),
        photos: z
            .array(
                z.object({
                    id: UUIDSchema,
                    url: z.string(),
                    createdAt: z.string(),
                }),
            )
            .optional()
            .openapi({
                description: "Photos attached to this expense",
            }),
    })
    .openapi({ title: "ExpenseResponse" });

export const ExpenseListResponse = z
    .object({
        expenses: z.array(ExpenseResponse),
    })
    .openapi({ title: "ExpenseListResponse" });

export const CreateExpenseResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        expense: ExpenseResponse,
    })
    .openapi({ title: "CreateExpenseResponse" });

export const UpdateExpenseResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        expense: ExpenseResponse,
    })
    .openapi({ title: "UpdateExpenseResponse" });

export const DeleteExpenseResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        expense: ExpenseResponse,
    })
    .openapi({ title: "DeleteExpenseResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateExpenseInput = z.infer<typeof CreateExpenseInput>;
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseInput>;
export type ListExpensesQuery = z.infer<typeof ListExpensesQuery>;
export type ExpenseResponse = z.infer<typeof ExpenseResponse>;
export type ExpenseListResponse = z.infer<typeof ExpenseListResponse>;
export type CreateExpenseResponse = z.infer<typeof CreateExpenseResponse>;
export type UpdateExpenseResponse = z.infer<typeof UpdateExpenseResponse>;
export type DeleteExpenseResponse = z.infer<typeof DeleteExpenseResponse>;

export type Expense = z.infer<typeof ExpenseResponse>;
