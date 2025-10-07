// lib/schemas/analytics.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 * Query Schemas: {Action}{Entity}Query
 * Response Schemas: {Entity}Response or {Action}{Entity}Response
 */

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const HourlySalesQuery = z
    .object({
        storeId: UUIDSchema.openapi({
            description: "Store ID to fetch hourly sales for",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .openapi({
                description: "Date in YYYY-MM-DD format",
                example: "2025-10-07",
            }),
    })
    .openapi({ title: "HourlySalesQuery" });

export const DailySalesQuery = z
    .object({
        storeId: UUIDSchema.openapi({
            description: "Store ID to fetch daily sales for",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
        month: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .openapi({
                description: "Month in YYYY-MM format",
                example: "2025-10",
            }),
    })
    .openapi({ title: "DailySalesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const HourlySalesDataPoint = z
    .object({
        hour: z.string().openapi({
            description: "Hour in HH:00 format (24-hour)",
            example: "14:00",
        }),
        cups: z.number().int().min(0).openapi({
            description: "Number of cups sold in this hour",
            example: 42,
        }),
    })
    .openapi({ title: "HourlySalesDataPoint" });

export const DailySalesDataPoint = z
    .object({
        date: z.string().openapi({
            description: "Date in YYYY-MM-DD format",
            example: "2025-10-15",
        }),
        cups: z.number().int().min(0).openapi({
            description: "Number of cups sold on this day",
            example: 156,
        }),
    })
    .openapi({ title: "DailySalesDataPoint" });

export const HourlySalesResponse = z
    .object({
        data: z.array(HourlySalesDataPoint).openapi({
            description: "Array of hourly sales data points",
        }),
    })
    .openapi({ title: "HourlySalesResponse" });

export const DailySalesResponse = z
    .object({
        data: z.array(DailySalesDataPoint).openapi({
            description: "Array of daily sales data points",
        }),
    })
    .openapi({ title: "DailySalesResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HourlySalesQuery = z.infer<typeof HourlySalesQuery>;
export type HourlySalesDataPoint = z.infer<typeof HourlySalesDataPoint>;
export type HourlySalesResponse = z.infer<typeof HourlySalesResponse>;

export type DailySalesQuery = z.infer<typeof DailySalesQuery>;
export type DailySalesDataPoint = z.infer<typeof DailySalesDataPoint>;
export type DailySalesResponse = z.infer<typeof DailySalesResponse>;
