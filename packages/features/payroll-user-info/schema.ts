import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const UpdatePayrollUserInfoInput = z
    .object({
        bankName: z.string().max(100).nullable().optional(),
        bankAccountNumber: z.string().max(50).nullable().optional(),
        bankAccountHolder: z.string().max(100).nullable().optional(),
    })
    .openapi({ title: "UpdatePayrollUserInfoInput" });

export const AdminUpdatePayrollUserInfoInput = z
    .object({
        commissionConfigId: UUIDSchema.nullable().optional(),
        payFrequency: z.enum(["daily", "weekly", "bi_weekly", "monthly"]).optional(),
        bankName: z.string().max(100).nullable().optional(),
        bankAccountNumber: z.string().max(50).nullable().optional(),
        bankAccountHolder: z.string().max(100).nullable().optional(),
    })
    .openapi({ title: "AdminUpdatePayrollUserInfoInput" });

export const GetPayrollUserInfoQuery = z
    .object({
        userId: UUIDSchema.optional(),
    })
    .openapi({ title: "GetPayrollUserInfoQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollUserInfoResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        userId: UUIDSchema,
        commissionConfigId: UUIDSchema.nullable(),
        commissionConfigName: z.string().nullable(),
        ratePerCup: z.number().nullable(),
        payFrequency: z.string().nullable(),
        bankName: z.string().nullable(),
        bankAccountNumber: z.string().nullable(),
        bankAccountHolder: z.string().nullable(),
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollUserInfoResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UpdatePayrollUserInfoInput = z.infer<typeof UpdatePayrollUserInfoInput>;
export type AdminUpdatePayrollUserInfoInput = z.infer<typeof AdminUpdatePayrollUserInfoInput>;
export type GetPayrollUserInfoQuery = z.infer<typeof GetPayrollUserInfoQuery>;
export type PayrollUserInfoResponse = z.infer<typeof PayrollUserInfoResponse>;
