import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";
import { ReimbursementResponse } from "../reimbursements/schema";

const PERIOD_STATUSES = ["pending", "approved", "on_hold", "paid"] as const;
const PAYOUT_STATUSES = ["pending", "approved", "on_hold", "paid"] as const;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListPayrollPeriodsQuery = z
    .object({
        status: z.enum(PERIOD_STATUSES).optional(),
    })
    .openapi({ title: "ListPayrollPeriodsQuery" });

export const ListPayrollEntriesQuery = z
    .object({
        periodId: UUIDSchema.optional(),
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "ListPayrollEntriesQuery" });

export const GetPayslipQuery = z
    .object({
        periodId: UUIDSchema,
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "GetPayslipQuery" });

export const ListPayoutsQuery = z
    .object({
        periodId: UUIDSchema.optional(),
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "ListPayoutsQuery" });

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const UpdatePayrollPeriodInput = z
    .object({
        status: z.enum(PERIOD_STATUSES),
    })
    .openapi({ title: "UpdatePayrollPeriodInput" });

export const UpdatePayrollEntryInput = z
    .object({
        status: z.enum(["draft", "approved", "paid"]),
    })
    .openapi({ title: "UpdatePayrollEntryInput" });

export const UpdatePayoutInput = z
    .object({
        status: z.enum(["approved", "on_hold", "paid"]),
        paymentProofUrl: z.string().url().optional(),
    })
    .openapi({ title: "UpdatePayoutInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollPeriodResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(PERIOD_STATUSES),
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

export const PayoutResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        payrollPeriodId: UUIDSchema,
        userId: UUIDSchema,
        status: z.enum(PAYOUT_STATUSES),
        cupsPayTotal: z.number(),
        reimbursementsTotal: z.number(),
        totalPay: z.number(),
        paymentProofUrl: z.string().nullable(),
        paidAt: z.string().nullable(),
        paidBy: UUIDSchema.nullable(),
        createdAt: z.string(),
    })
    .openapi({ title: "PayoutResponse" });

export const PayslipResponse = z
    .object({
        period: PayrollPeriodResponse,
        payout: PayoutResponse.nullable(),
        entries: z.array(PayrollEntryResponse),
        reimbursements: z.array(ReimbursementResponse),
        cupsPayTotal: z.number(),
        reimbursementsTotal: z.number(),
        totalPay: z.number(),
        ratePerCup: z.number(),
    })
    .openapi({ title: "PayslipResponse" });

export const PayrollPeriodListResponse = z
    .object({ periods: z.array(PayrollPeriodResponse) })
    .openapi({ title: "PayrollPeriodListResponse" });

export const PayrollEntryListResponse = z
    .object({ entries: z.array(PayrollEntryResponse) })
    .openapi({ title: "PayrollEntryListResponse" });

export const PayoutListResponse = z
    .object({ payouts: z.array(PayoutResponse) })
    .openapi({ title: "PayoutListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListPayrollPeriodsQuery = z.infer<typeof ListPayrollPeriodsQuery>;
export type ListPayrollEntriesQuery = z.infer<typeof ListPayrollEntriesQuery>;
export type GetPayslipQuery = z.infer<typeof GetPayslipQuery>;
export type ListPayoutsQuery = z.infer<typeof ListPayoutsQuery>;
export type UpdatePayrollPeriodInput = z.infer<typeof UpdatePayrollPeriodInput>;
export type UpdatePayrollEntryInput = z.infer<typeof UpdatePayrollEntryInput>;
export type UpdatePayoutInput = z.infer<typeof UpdatePayoutInput>;
export type PayrollPeriodResponse = z.infer<typeof PayrollPeriodResponse>;
export type PayrollEntryResponse = z.infer<typeof PayrollEntryResponse>;
export type PayoutResponse = z.infer<typeof PayoutResponse>;
export type PayslipResponse = z.infer<typeof PayslipResponse>;
export type PayrollPeriodListResponse = z.infer<typeof PayrollPeriodListResponse>;
export type PayrollEntryListResponse = z.infer<typeof PayrollEntryListResponse>;
export type PayoutListResponse = z.infer<typeof PayoutListResponse>;
