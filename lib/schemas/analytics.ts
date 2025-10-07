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

export const HourlySalesResponse = z
    .object({
        data: z.array(HourlySalesDataPoint).openapi({
            description: "Array of hourly sales data points",
        }),
    })
    .openapi({ title: "HourlySalesResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HourlySalesQuery = z.infer<typeof HourlySalesQuery>;
export type HourlySalesDataPoint = z.infer<typeof HourlySalesDataPoint>;
export type HourlySalesResponse = z.infer<typeof HourlySalesResponse>;
