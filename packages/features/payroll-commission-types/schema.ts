import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreatePayrollCommissionTypeInput = z
    .object({
        name: z.string().min(1).max(100),
        slug: z.string().min(1).max(100).regex(/^[A-Z0-9_]+$/, "Slug must be uppercase letters, digits, and underscores"),
    })
    .openapi({ title: "CreatePayrollCommissionTypeInput" });

export const UpdatePayrollCommissionTypeInput = z
    .object({
        name: z.string().min(1).max(100).optional(),
        isEnabled: z.boolean().optional(),
    })
    .openapi({ title: "UpdatePayrollCommissionTypeInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const PayrollCommissionTypeResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        name: z.string(),
        slug: z.string(),
        isEnabled: z.boolean(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "PayrollCommissionTypeResponse" });

export const PayrollCommissionTypeListResponse = z
    .object({ commissionTypes: z.array(PayrollCommissionTypeResponse) })
    .openapi({ title: "PayrollCommissionTypeListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreatePayrollCommissionTypeInput = z.infer<typeof CreatePayrollCommissionTypeInput>;
export type UpdatePayrollCommissionTypeInput = z.infer<typeof UpdatePayrollCommissionTypeInput>;
export type PayrollCommissionTypeResponse = z.infer<typeof PayrollCommissionTypeResponse>;
export type PayrollCommissionTypeListResponse = z.infer<typeof PayrollCommissionTypeListResponse>;
