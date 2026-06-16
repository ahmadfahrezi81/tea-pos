import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";
import { PayrollClaimResponse } from "../payroll-claims/schema";

const COMMISSION_CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
const PAYOUT_STATUSES = ["pending", "paid"] as const;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListPayrollPeriodsQuery = z
    .object({})
    .openapi({ title: "ListPayrollPeriodsQuery" });

export const ListPayrollCommissionsQuery = z
    .object({
        periodId: UUIDSchema.optional(),
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "ListPayrollCommissionsQuery" });

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

export const UpdatePayrollCommissionInput = z
    .object({
        status: z.enum(COMMISSION_CLAIM_STATUSES),
    })
    .openapi({ title: "UpdatePayrollCommissionInput" });

export const UpdatePayoutInput = z
    .object({
        status: z.literal("paid"),
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
        closedAt: z.string().nullable(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollPeriodResponse" });

export const PayrollCommissionResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        storeId: UUIDSchema,
        userId: UUIDSchema,
        payrollPeriodId: UUIDSchema,
        dailySummaryId: UUIDSchema,
        commissionTypeId: UUIDSchema.nullable(),
        date: z.string(),
        totalCups: z.number(),
        ratePerCup: z.number(),
        grossPay: z.number(),
        status: z.enum(COMMISSION_CLAIM_STATUSES),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollCommissionResponse" });

export const PayoutResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        payrollPeriodId: UUIDSchema,
        userId: UUIDSchema,
        status: z.enum(PAYOUT_STATUSES),
        commissionsTotal: z.number(),
        claimsTotal: z.number(),
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
        commissions: z.array(PayrollCommissionResponse),
        claims: z.array(PayrollClaimResponse),
        commissionsTotal: z.number(),
        claimsTotal: z.number(),
        totalPay: z.number(),
        ratePerCup: z.number(),
    })
    .openapi({ title: "PayslipResponse" });

export const PayrollPeriodListResponse = z
    .object({ periods: z.array(PayrollPeriodResponse) })
    .openapi({ title: "PayrollPeriodListResponse" });

export const PayrollCommissionListResponse = z
    .object({ commissions: z.array(PayrollCommissionResponse) })
    .openapi({ title: "PayrollCommissionListResponse" });

export const PayoutListResponse = z
    .object({ payouts: z.array(PayoutResponse) })
    .openapi({ title: "PayoutListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListPayrollPeriodsQuery = z.infer<typeof ListPayrollPeriodsQuery>;
export type ListPayrollCommissionsQuery = z.infer<typeof ListPayrollCommissionsQuery>;
export type GetPayslipQuery = z.infer<typeof GetPayslipQuery>;
export type ListPayoutsQuery = z.infer<typeof ListPayoutsQuery>;
export type UpdatePayrollCommissionInput = z.infer<typeof UpdatePayrollCommissionInput>;
export type UpdatePayoutInput = z.infer<typeof UpdatePayoutInput>;
export type PayrollPeriodResponse = z.infer<typeof PayrollPeriodResponse>;
export type PayrollCommissionResponse = z.infer<typeof PayrollCommissionResponse>;
export type PayoutResponse = z.infer<typeof PayoutResponse>;
export type PayslipResponse = z.infer<typeof PayslipResponse>;
export type PayrollPeriodListResponse = z.infer<typeof PayrollPeriodListResponse>;
export type PayrollCommissionListResponse = z.infer<typeof PayrollCommissionListResponse>;
export type PayoutListResponse = z.infer<typeof PayoutListResponse>;
