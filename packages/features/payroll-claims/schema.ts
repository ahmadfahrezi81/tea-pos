import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreatePayrollClaimInput = z
    .object({
        claimTypeId: UUIDSchema,
        amount: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        storeId: UUIDSchema.optional(),
        notes: z.string().max(500).optional(),
        photoUrl: z.string().url().optional(),
    })
    .openapi({ title: "CreatePayrollClaimInput" });

export const ListPayrollClaimsQuery = z
    .object({
        limit: z.coerce.number().int().positive().optional(),
    })
    .openapi({ title: "ListPayrollClaimsQuery" });

export const ListAllPayrollClaimsQuery = z
    .object({
        status: z.enum(["pending", "approved", "rejected", "paid"]).optional(),
        periodId: UUIDSchema.optional(),
    })
    .openapi({ title: "ListAllPayrollClaimsQuery" });

export const UpdatePayrollClaimStatusInput = z
    .object({
        status: z.enum(["approved", "rejected"]),
    })
    .openapi({ title: "UpdatePayrollClaimStatusInput" });

export const GetClaimableTypesQuery = z
    .object({
        periodId: UUIDSchema,
    })
    .openapi({ title: "GetClaimableTypesQuery" });

export const GetClaimableDatesQuery = z
    .object({
        periodId: UUIDSchema,
    })
    .openapi({ title: "GetClaimableDatesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollClaimResponse = z
    .object({
        id: z.string(),
        userId: z.string(),
        storeId: z.string().nullable(),
        payrollPeriodId: z.string(),
        claimTypeId: z.string().nullable(),
        claimTypeName: z.string().nullable().optional(),
        frequency: z.string().nullable(),
        amount: z.number(),
        date: z.string(),
        notes: z.string().nullable(),
        photoUrl: z.string().nullable(),
        status: z.enum(["pending", "approved", "rejected", "paid"]),
        paidAt: z.string().nullable(),
        paidBy: z.string().nullable(),
        paymentProofUrl: z.string().nullable(),
        createdAt: z.string(),
    })
    .openapi({ title: "PayrollClaimResponse" });

export const PayrollClaimListResponse = z
    .object({ claims: z.array(PayrollClaimResponse) })
    .openapi({ title: "PayrollClaimListResponse" });

export const ClaimableTypeResponse = z
    .object({
        id: z.string(),
        name: z.string(),
        frequency: z.enum(["weekly", "monthly", "one_time"]),
        amount: z.number().int().default(0),
        claimable: z.boolean(),
    })
    .openapi({ title: "ClaimableTypeResponse" });

export const ClaimableTypesResponse = z
    .object({ types: z.array(ClaimableTypeResponse) })
    .openapi({ title: "ClaimableTypesResponse" });

export const ClaimableDatesResponse = z
    .object({ dates: z.array(z.string()) })
    .openapi({ title: "ClaimableDatesResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePayrollClaimInput = z.infer<typeof CreatePayrollClaimInput>;
export type ListPayrollClaimsQuery = z.infer<typeof ListPayrollClaimsQuery>;
export type ListAllPayrollClaimsQuery = z.infer<typeof ListAllPayrollClaimsQuery>;
export type UpdatePayrollClaimStatusInput = z.infer<typeof UpdatePayrollClaimStatusInput>;
export type GetClaimableTypesQuery = z.infer<typeof GetClaimableTypesQuery>;
export type GetClaimableDatesQuery = z.infer<typeof GetClaimableDatesQuery>;
export type PayrollClaimResponse = z.infer<typeof PayrollClaimResponse>;
export type PayrollClaimListResponse = z.infer<typeof PayrollClaimListResponse>;
export type ClaimableTypeResponse = z.infer<typeof ClaimableTypeResponse>;
export type ClaimableTypesResponse = z.infer<typeof ClaimableTypesResponse>;
export type ClaimableDatesResponse = z.infer<typeof ClaimableDatesResponse>;
