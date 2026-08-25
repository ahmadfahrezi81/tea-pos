import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";
import { PayrollClaimResponse } from "../payroll-claims/schema";

const COMMISSION_CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;
/* "skipped" closes a period with no transfer — every commission rejected, or
   nothing earned in the window. Terminal in the same way "paid" is. */
const PAYOUT_STATUSES = ["pending", "paid", "skipped"] as const;
const PAYOUT_CLOSING_STATUSES = ["paid", "skipped"] as const;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListPayrollCommissionsQuery = z
    .object({
        userId: UUIDSchema.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    })
    .openapi({ title: "ListPayrollCommissionsQuery" });

export const GetPayslipQuery = z
    .object({
        payoutId: UUIDSchema,
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "GetPayslipQuery" });

export const ListPayoutsQuery = z
    .object({
        userId: UUIDSchema.optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
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

/**
 * Review every pending item on one day at once.
 *
 * The day is addressed by (user, date) rather than by a list of row ids: the
 * client would have to send ids it read a moment ago, and anything approved in
 * another tab since then would be missed or clobbered. The server re-reads what
 * is pending *now* and acts on that.
 */
export const ReviewPayrollDayInput = z
    .object({
        userId: UUIDSchema,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd"),
        // Only a decision, never back to "pending": this is a bulk action, and
        // un-reviewing a whole day is not something the screen offers.
        status: z.enum(["approved", "rejected"]),
    })
    .openapi({ title: "ReviewPayrollDayInput" });

export const ReviewPayrollDayResponse = z
    .object({
        commissions: z.number().int(),
        claims: z.number().int(),
    })
    .openapi({ title: "ReviewPayrollDayResponse" });

export const UpdatePayoutInput = z
    .object({
        // Both values close the period. Whether a payout is allowed to be
        // skipped is a judgement the person looking at the payslip makes — the
        // zero-total rule that surfaces the option is in the UI, not here.
        status: z.enum(PAYOUT_CLOSING_STATUSES),
        paymentProofUrl: z.string().url().optional(),
        // Written once, when payment is confirmed, and shown to the staff
        // member on their payslip. Capped so it stays a note rather than a
        // document; empty is expressed by omitting it, not by "".
        notes: z.string().trim().min(1).max(500).optional(),
    })
    .openapi({ title: "UpdatePayoutInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollCommissionResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        storeId: UUIDSchema,
        userId: UUIDSchema,
        dailySummaryId: UUIDSchema,
        commissionConfigId: UUIDSchema.nullable(),
        date: z.string(),
        totalCups: z.number(),
        totalOrders: z.number(),
        ratePerCup: z.number(),
        totalCommission: z.number(),
        status: z.enum(COMMISSION_CLAIM_STATUSES),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollCommissionResponse" });

export const PayoutResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        userId: UUIDSchema,
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(PAYOUT_STATUSES),
        totalCups: z.number(),
        totalOrders: z.number(),
        totalClaims: z.number().optional().default(0),
        approvedCount: z.number().optional().default(0),
        pendingCount: z.number().optional().default(0),
        commissionsTotal: z.number(),
        claimsTotal: z.number(),
        totalPay: z.number(),
        paymentProofUrl: z.string().nullable(),
        paidAt: z.string().nullable(),
        paidBy: UUIDSchema.nullable(),
        // Nullish rather than nullable: payouts read back through paths that
        // select an explicit column list, so an older query that doesn't ask
        // for notes should not fail the parse.
        notes: z.string().nullish(),
        createdAt: z.string(),
    })
    .openapi({ title: "PayoutResponse" });

export const PayslipResponse = z
    .object({
        payout: PayoutResponse,
        commissions: z.array(PayrollCommissionResponse),
        claims: z.array(PayrollClaimResponse),
        commissionsTotal: z.number(),
        claimsTotal: z.number(),
        totalPay: z.number(),
        ratePerCup: z.number(),
        totalOrders: z.number(),
        paidByName: z.string().nullable(),
    })
    .openapi({ title: "PayslipResponse" });

export const PayrollCommissionListResponse = z
    .object({ commissions: z.array(PayrollCommissionResponse) })
    .openapi({ title: "PayrollCommissionListResponse" });

export const PayoutListResponse = z
    .object({ payouts: z.array(PayoutResponse) })
    .openapi({ title: "PayoutListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListPayrollCommissionsQuery = z.infer<typeof ListPayrollCommissionsQuery>;
export type GetPayslipQuery = z.infer<typeof GetPayslipQuery>;
export type ListPayoutsQuery = z.infer<typeof ListPayoutsQuery>;
export type UpdatePayrollCommissionInput = z.infer<typeof UpdatePayrollCommissionInput>;
export type UpdatePayoutInput = z.infer<typeof UpdatePayoutInput>;
export type ReviewPayrollDayInput = z.infer<typeof ReviewPayrollDayInput>;
export type ReviewPayrollDayResponse = z.infer<typeof ReviewPayrollDayResponse>;
export type PayrollCommissionResponse = z.infer<typeof PayrollCommissionResponse>;
export type PayoutResponse = z.infer<typeof PayoutResponse>;
export type PayslipResponse = z.infer<typeof PayslipResponse>;
export type PayrollCommissionListResponse = z.infer<typeof PayrollCommissionListResponse>;
export type PayoutListResponse = z.infer<typeof PayoutListResponse>;
