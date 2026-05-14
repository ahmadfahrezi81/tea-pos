import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListPayrollPeriodsQuery = z
    .object({
        status: z.enum(["open", "processing", "paid"]).optional().openapi({
            description: "Filter by period status",
        }),
    })
    .openapi({ title: "ListPayrollPeriodsQuery" });

export const ListPayrollEntriesQuery = z
    .object({
        periodId: UUIDSchema.optional().openapi({ description: "Filter by payroll period" }),
        userId: UUIDSchema.optional().openapi({ description: "Filter by user" }),
    })
    .openapi({ title: "ListPayrollEntriesQuery" });

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const UpdatePayrollEntryInput = z
    .object({
        status: z.enum(["draft", "approved", "paid"]).openapi({
            description: "New status for the payroll entry",
        }),
    })
    .openapi({ title: "UpdatePayrollEntryInput" });

export const UpdatePayrollPeriodInput = z
    .object({
        status: z.enum(["open", "processing", "paid"]).openapi({
            description: "New status for the payroll period",
        }),
    })
    .openapi({ title: "UpdatePayrollPeriodInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollPeriodResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(["open", "processing", "paid"]),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollPeriodResponse" });

export const PayrollEntryResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        storeId: UUIDSchema,
        userId: UUIDSchema,
        payrollPeriodId: UUIDSchema,
        dailySummaryId: UUIDSchema,
        date: z.string(),
        totalCups: z.number(),
        ratePerCup: z.number(),
        grossPay: z.number(),
        status: z.enum(["draft", "approved", "paid"]),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollEntryResponse" });

export const PayrollPeriodListResponse = z
    .object({ periods: z.array(PayrollPeriodResponse) })
    .openapi({ title: "PayrollPeriodListResponse" });

export const PayrollEntryListResponse = z
    .object({ entries: z.array(PayrollEntryResponse) })
    .openapi({ title: "PayrollEntryListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListPayrollPeriodsQuery = z.infer<typeof ListPayrollPeriodsQuery>;
export type ListPayrollEntriesQuery = z.infer<typeof ListPayrollEntriesQuery>;
export type UpdatePayrollEntryInput = z.infer<typeof UpdatePayrollEntryInput>;
export type UpdatePayrollPeriodInput = z.infer<typeof UpdatePayrollPeriodInput>;
export type PayrollPeriodResponse = z.infer<typeof PayrollPeriodResponse>;
export type PayrollEntryResponse = z.infer<typeof PayrollEntryResponse>;
export type PayrollPeriodListResponse = z.infer<typeof PayrollPeriodListResponse>;
export type PayrollEntryListResponse = z.infer<typeof PayrollEntryListResponse>;
