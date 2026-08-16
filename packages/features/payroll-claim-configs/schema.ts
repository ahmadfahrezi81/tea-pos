import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreatePayrollClaimConfigInput = z
    .object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, "Slug must be uppercase letters, digits, and underscores"),
        frequency: z.enum(["daily", "weekly", "monthly", "one_time"]),
        amount: z.number().int().min(0).default(0),
        claimSource: z.enum(["manual", "auto", "auto_submit"]).default("manual"),
        autoThresholdHours: z.number().min(0).optional(),
    })
    .refine((v) => v.claimSource !== "auto" || v.autoThresholdHours !== undefined, {
        message: "autoThresholdHours is required for auto claim types",
        path: ["autoThresholdHours"],
    })
    .openapi({ title: "CreatePayrollClaimConfigInput" });

export const UpdatePayrollClaimConfigInput = z
    .object({
        name: z.string().min(1).max(100).optional(),
        isEnabled: z.boolean().optional(),
        amount: z.number().int().min(0).optional(),
        claimSource: z.enum(["manual", "auto", "auto_submit"]).optional(),
        autoThresholdHours: z.number().min(0).optional(),
    })
    .openapi({ title: "UpdatePayrollClaimConfigInput" });

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

export const PayrollClaimConfigResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        name: z.string(),
        slug: z.string(),
        frequency: z.enum(["daily", "weekly", "monthly", "one_time"]),
        isEnabled: z.boolean(),
        amount: z.number().int().default(0),
        claimSource: z.enum(["manual", "auto", "auto_submit"]),
        autoThresholdHours: z.number().nullable(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollClaimConfigResponse" });

export const PayrollClaimConfigListResponse = z
    .object({ claimTypes: z.array(PayrollClaimConfigResponse) })
    .openapi({ title: "PayrollClaimConfigListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePayrollClaimConfigInput = z.infer<typeof CreatePayrollClaimConfigInput>;
export type UpdatePayrollClaimConfigInput = z.infer<typeof UpdatePayrollClaimConfigInput>;
export type SetClaimEligibilityInput = z.infer<typeof SetClaimEligibilityInput>;
export type GetClaimEligibilityQuery = z.infer<typeof GetClaimEligibilityQuery>;
export type PayrollClaimConfigResponse = z.infer<typeof PayrollClaimConfigResponse>;
export type PayrollClaimConfigListResponse = z.infer<typeof PayrollClaimConfigListResponse>;
