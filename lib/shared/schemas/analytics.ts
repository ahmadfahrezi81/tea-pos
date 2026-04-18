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

export const ProductSalesQuery = z
    .object({
        storeId: UUIDSchema.openapi({
            description: "Store ID to fetch product sales for",
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
    .openapi({ title: "ProductSalesQuery" });

export const DayOfWeekSalesQuery = z
    .object({
        storeId: UUIDSchema.openapi({
            description: "Store ID to fetch day-of-week sales for",
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
    .openapi({ title: "DayOfWeekSalesQuery" });

// ============================================================================
// ADMIN DASHBOARD QUERY SCHEMAS (NEW)
// ============================================================================

export const AdminDateRangeQuery = z
    .object({
        dateFrom: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .openapi({
                description: "Start date in YYYY-MM-DD format",
                example: "2025-10-01",
            }),
        dateTo: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .openapi({
                description: "End date in YYYY-MM-DD format",
                example: "2025-10-07",
            }),
    })
    .openapi({ title: "AdminDateRangeQuery" });

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

export const DayOfWeekSalesDataPoint = z
    .object({
        dayOfWeek: z.string().openapi({
            description: "Day of week name",
            example: "Monday",
        }),
        dayIndex: z.number().int().min(0).max(6).openapi({
            description: "Day index (0=Sunday, 6=Saturday)",
            example: 1,
        }),
        averageCups: z.number().min(0).openapi({
            description: "Average cups sold on this day of week",
            example: 150.5,
        }),
        totalCups: z.number().int().min(0).openapi({
            description: "Total cups sold on this day of week",
            example: 602,
        }),
        occurrences: z.number().int().min(0).openapi({
            description: "Number of times this day occurred in the month",
            example: 4,
        }),
    })
    .openapi({ title: "DayOfWeekSalesDataPoint" });

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

export const ProductSalesDataPoint = z
    .object({
        productId: z.string().openapi({
            description: "Product ID",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
        productName: z.string().openapi({
            description: "Product name",
            example: "Espresso",
        }),
        quantity: z.number().int().min(0).openapi({
            description: "Total quantity sold",
            example: 450,
        }),
        percentage: z.number().min(0).max(100).openapi({
            description: "Percentage of total sales",
            example: 75.5,
        }),
    })
    .openapi({ title: "ProductSalesDataPoint" });

export const ProductSalesResponse = z
    .object({
        data: z.array(ProductSalesDataPoint).openapi({
            description:
                "Array of product sales data points, sorted by quantity descending",
        }),
        totalQuantity: z.number().int().min(0).openapi({
            description: "Total quantity of all products sold",
            example: 596,
        }),
    })
    .openapi({ title: "ProductSalesResponse" });

export const DayOfWeekSalesResponse = z
    .object({
        data: z.array(DayOfWeekSalesDataPoint).openapi({
            description: "Array of day-of-week sales data points",
        }),
    })
    .openapi({ title: "DayOfWeekSalesResponse" });

// ============================================================================
// ADMIN DASHBOARD RESPONSE SCHEMAS (NEW)
// ============================================================================

export const AdminMetricsResponse = z
    .object({
        totalRevenue: z.number().min(0).openapi({
            description: "Total revenue in Rupiah",
            example: 1249500,
        }),
        totalOrders: z.number().int().min(0).openapi({
            description: "Total number of orders",
            example: 1284,
        }),
        totalCups: z.number().int().min(0).openapi({
            description: "Total number of cups sold",
            example: 3842,
        }),
        averageOrderValue: z.number().min(0).openapi({
            description: "Average order value in Rupiah",
            example: 18375,
        }),
        revenueChange: z.number().openapi({
            description: "Revenue percentage change vs previous period",
            example: 20.1,
        }),
        ordersChange: z.number().openapi({
            description: "Orders percentage change vs previous period",
            example: 15.3,
        }),
        cupsChange: z.number().openapi({
            description: "Cups percentage change vs previous period",
            example: 12.5,
        }),
        aovChange: z.number().openapi({
            description: "AOV percentage change vs previous period",
            example: -2.4,
        }),
    })
    .openapi({ title: "AdminMetricsResponse" });

export const AdminTimelineDataPoint = z
    .object({
        label: z.string().openapi({
            description: "Time label (HH:00 for hourly, YYYY-MM-DD for daily)",
            example: "14:00",
        }),
        orders: z.number().int().min(0).openapi({
            description: "Number of orders",
            example: 105,
        }),
        cups: z.number().int().min(0).openapi({
            description: "Number of cups sold",
            example: 145,
        }),
    })
    .openapi({ title: "AdminTimelineDataPoint" });

export const AdminTimelineResponse = z
    .object({
        data: z.array(AdminTimelineDataPoint).openapi({
            description: "Array of timeline data points",
        }),
        granularity: z.enum(["hourly", "daily"]).openapi({
            description: "Data granularity based on date range",
            example: "hourly",
        }),
    })
    .openapi({ title: "AdminTimelineResponse" });

export const AdminStoreBreakdownDataPoint = z
    .object({
        storeId: z.string().openapi({
            description: "Store ID",
            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        }),
        storeName: z.string().openapi({
            description: "Store name",
            example: "Downtown Store",
        }),
        orders: z.number().int().min(0).openapi({
            description: "Number of orders from this store",
            example: 450,
        }),
        percentage: z.number().min(0).max(100).openapi({
            description: "Percentage of total orders",
            example: 35,
        }),
    })
    .openapi({ title: "AdminStoreBreakdownDataPoint" });

export const AdminStoreBreakdownResponse = z
    .object({
        data: z.array(AdminStoreBreakdownDataPoint).openapi({
            description: "Array of store breakdown data points",
        }),
        totalOrders: z.number().int().min(0).openapi({
            description: "Total orders across all stores",
            example: 1285,
        }),
    })
    .openapi({ title: "AdminStoreBreakdownResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type HourlySalesQuery = z.infer<typeof HourlySalesQuery>;
export type HourlySalesDataPoint = z.infer<typeof HourlySalesDataPoint>;
export type HourlySalesResponse = z.infer<typeof HourlySalesResponse>;

export type DailySalesQuery = z.infer<typeof DailySalesQuery>;
export type DailySalesDataPoint = z.infer<typeof DailySalesDataPoint>;
export type DailySalesResponse = z.infer<typeof DailySalesResponse>;

export type ProductSalesQuery = z.infer<typeof ProductSalesQuery>;
export type ProductSalesDataPoint = z.infer<typeof ProductSalesDataPoint>;
export type ProductSalesResponse = z.infer<typeof ProductSalesResponse>;

// Admin Dashboard Types
export type AdminDateRangeQuery = z.infer<typeof AdminDateRangeQuery>;
export type AdminMetricsResponse = z.infer<typeof AdminMetricsResponse>;
export type AdminTimelineDataPoint = z.infer<typeof AdminTimelineDataPoint>;
export type AdminTimelineResponse = z.infer<typeof AdminTimelineResponse>;
export type AdminStoreBreakdownDataPoint = z.infer<
    typeof AdminStoreBreakdownDataPoint
>;
export type AdminStoreBreakdownResponse = z.infer<
    typeof AdminStoreBreakdownResponse
>;

export type DayOfWeekSalesQuery = z.infer<typeof DayOfWeekSalesQuery>;
export type DayOfWeekSalesDataPoint = z.infer<typeof DayOfWeekSalesDataPoint>;
export type DayOfWeekSalesResponse = z.infer<typeof DayOfWeekSalesResponse>;
