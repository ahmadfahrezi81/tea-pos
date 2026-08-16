import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreatePayrollCommissionConfigInput = z
    .object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, "Slug must be uppercase letters, digits, and underscores"),
        ratePerCup: z.number().int().nonnegative(),
    })
    .openapi({ title: "CreatePayrollCommissionConfigInput" });

export const UpdatePayrollCommissionConfigInput = z
    .object({
        name: z.string().min(1).max(100).optional(),
        isEnabled: z.boolean().optional(),
        ratePerCup: z.number().int().nonnegative().optional(),
    })
    .openapi({ title: "UpdatePayrollCommissionConfigInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollCommissionConfigResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        name: z.string(),
        slug: z.string(),
        isEnabled: z.boolean(),
        ratePerCup: z.number(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollCommissionConfigResponse" });

export const PayrollCommissionConfigListResponse = z
    .object({ commissionTypes: z.array(PayrollCommissionConfigResponse) })
    .openapi({ title: "PayrollCommissionConfigListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePayrollCommissionConfigInput = z.infer<typeof CreatePayrollCommissionConfigInput>;
export type UpdatePayrollCommissionConfigInput = z.infer<typeof UpdatePayrollCommissionConfigInput>;
export type PayrollCommissionConfigResponse = z.infer<typeof PayrollCommissionConfigResponse>;
export type PayrollCommissionConfigListResponse = z.infer<typeof PayrollCommissionConfigListResponse>;
