// lib/schemas/daily-summaries.ts
import { z } from "zod";
import { UUIDSchema } from "./common";
import { ExpenseResponse } from "./expenses";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateDailySummaryInput = z
    .object({
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        sellerId: UUIDSchema.openapi({
            description: "ID of the seller managing this summary",
        }),
        managerId: UUIDSchema.nullable().optional().openapi({
            description: "ID of the manager (optional)",
        }),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .openapi({
                description: "Date for this daily summary",
                example: "2025-10-05",
            }),
        openingBalance: z.number().min(0).optional().openapi({
            description: "Opening cash balance for the day",
            example: 100000,
        }),
    })
    .openapi({ title: "CreateDailySummaryInput" });

export const UpdateDailySummaryInput = z
    .object({
        id: UUIDSchema,
        openingBalance: z.number().min(0).optional().openapi({
            description: "Opening cash balance",
        }),
        actualCash: z.number().min(0).nullable().optional().openapi({
            description: "Actual cash counted at end of day",
        }),
        notes: z.string().max(1000).nullable().optional().openapi({
            description: "Additional notes",
        }),
        closedAt: z.string().nullable().optional().openapi({
            description: "Timestamp when summary was closed",
        }),
    })
    .openapi({ title: "UpdateDailySummaryInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListDailySummariesQuery = z
    .object({
        storeId: UUIDSchema.optional().openapi({
            description: "Filter by store ID",
        }),
        month: z
            .string()
            .regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)")
            .optional()
            .openapi({
                description: "Filter by month (YYYY-MM format)",
                example: "2025-10",
            }),
    })
    .openapi({ title: "ListDailySummariesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const DailySummaryResponse = z
    .object({
        id: UUIDSchema,
        storeId: UUIDSchema,
        sellerId: UUIDSchema,
        managerId: UUIDSchema.nullable(),
        date: z.string(),
        openingBalance: z.number(),
        totalSales: z.number(),
        totalOrders: z.number(), // ← new
        totalCups: z.number(), // ← new
        totalExpenses: z.number(), // ← new (was optional before)
        expectedCash: z.number(),
        actualCash: z.number().nullable(),
        variance: z.number().nullable(),
        notes: z.string().nullable(),
        closedAt: z.string().nullable(),
        tenantId: UUIDSchema,
        createdAt: z.string().nullable(),
        stores: z.object({ name: z.string() }).nullable().optional(),
        manager: z.object({ fullName: z.string() }).nullable().optional(),
        seller: z.object({ fullName: z.string() }).nullable().optional(),
        expenses: z.array(ExpenseResponse).optional().openapi({
            description: "Expenses for this summary (only populated for today)",
        }),
    })
    .openapi({ title: "DailySummaryResponse" });

export const ProductBreakdown = z
    .record(
        z.string(),
        z.record(
            z.string(),
            z.object({
                quantity: z.number(),
                revenue: z.number(),
            }),
        ),
    )
    .openapi({
        description: "Product breakdown by date and product name",
    });

export const MonthlyTotals = z
    .object({
        totalSales: z.number(),
        totalOrders: z.number(),
        totalCups: z.number(),
        totalExpenses: z.number(),
    })
    .openapi({ title: "MonthlyTotals" });

export const DailySummaryListResponse = z
    .object({
        summaries: z.array(DailySummaryResponse),
        productBreakdown: ProductBreakdown.optional(), // only populated for today
        expensesByDate: z
            .record(z.string(), z.array(ExpenseResponse))
            .optional(),
        monthlyTotals: MonthlyTotals.optional(),
    })
    .openapi({ title: "DailySummaryListResponse" });

// ordersByDate removed — we no longer send raw orders to the client

export const CreateDailySummaryResponse = DailySummaryResponse.openapi({
    title: "CreateDailySummaryResponse",
});

export const UpdateDailySummaryResponse = DailySummaryResponse.openapi({
    title: "UpdateDailySummaryResponse",
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateDailySummaryInput = z.infer<typeof CreateDailySummaryInput>;
export type UpdateDailySummaryInput = z.infer<typeof UpdateDailySummaryInput>;
export type ListDailySummariesQuery = z.infer<typeof ListDailySummariesQuery>;
export type DailySummaryResponse = z.infer<typeof DailySummaryResponse>;
export type ProductBreakdown = z.infer<typeof ProductBreakdown>;
export type MonthlyTotals = z.infer<typeof MonthlyTotals>;
export type DailySummaryListResponse = z.infer<typeof DailySummaryListResponse>;
export type CreateDailySummaryResponse = z.infer<
    typeof CreateDailySummaryResponse
>;
export type UpdateDailySummaryResponse = z.infer<
    typeof UpdateDailySummaryResponse
>;

export type DailySummary = z.infer<typeof DailySummaryResponse>;
