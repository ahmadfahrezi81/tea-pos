import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreatePayrollClaimTypeInput = z
    .object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, "Slug must be uppercase letters, digits, and underscores"),
        frequency: z.enum(["daily", "weekly", "monthly", "one_time"]),
        amount: z.number().int().min(0).default(0),
        claimSource: z.enum(["manual", "auto"]).default("manual"),
        autoThresholdHours: z.number().int().min(0).optional(),
    })
    .refine((v) => v.claimSource !== "auto" || v.autoThresholdHours !== undefined, {
        message: "autoThresholdHours is required for auto claim types",
        path: ["autoThresholdHours"],
    })
    .openapi({ title: "CreatePayrollClaimTypeInput" });

export const UpdatePayrollClaimTypeInput = z
    .object({
        name: z.string().min(1).max(100).optional(),
        isEnabled: z.boolean().optional(),
        amount: z.number().int().min(0).optional(),
        claimSource: z.enum(["manual", "auto"]).optional(),
        autoThresholdHours: z.number().int().min(0).optional(),
    })
    .openapi({ title: "UpdatePayrollClaimTypeInput" });

export const SetClaimEligibilityInput = z
    .object({
        userId: UUIDSchema,
        claimConfigIds: z.array(UUIDSchema),
    })
    .openapi({ title: "SetClaimEligibilityInput" });

export const GetClaimEligibilityQuery = z
    .object({
        userId: UUIDSchema,
    })
    .openapi({ title: "GetClaimEligibilityQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollClaimTypeResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        name: z.string(),
        slug: z.string(),
        frequency: z.enum(["daily", "weekly", "monthly", "one_time"]),
        isEnabled: z.boolean(),
        amount: z.number().int().default(0),
        claimSource: z.enum(["manual", "auto"]),
        autoThresholdHours: z.number().int().nullable(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollClaimTypeResponse" });

export const PayrollClaimTypeListResponse = z
    .object({ claimTypes: z.array(PayrollClaimTypeResponse) })
    .openapi({ title: "PayrollClaimTypeListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePayrollClaimTypeInput = z.infer<typeof CreatePayrollClaimTypeInput>;
export type UpdatePayrollClaimTypeInput = z.infer<typeof UpdatePayrollClaimTypeInput>;
export type SetClaimEligibilityInput = z.infer<typeof SetClaimEligibilityInput>;
export type GetClaimEligibilityQuery = z.infer<typeof GetClaimEligibilityQuery>;
export type PayrollClaimTypeResponse = z.infer<typeof PayrollClaimTypeResponse>;
export type PayrollClaimTypeListResponse = z.infer<typeof PayrollClaimTypeListResponse>;
