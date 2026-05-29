import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

const COMMISSION_ROLES = ["USER", "DRIVER", "SUPPLIER"] as const;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const UpsertCommissionConfigInput = z
    .object({
        role: z.enum(COMMISSION_ROLES).openapi({
            description: "Role this rate applies to",
        }),
        ratePerCup: z.number().min(0).openapi({
            description: "Commission amount per cup sold",
            example: 500,
        }),
        effectiveDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .openapi({ description: "Date this rate takes effect", example: "2026-05-14" }),
    })
    .openapi({ title: "UpsertCommissionConfigInput" });

export const GetCommissionRateQuery = z
    .object({
        role: z.enum(COMMISSION_ROLES).openapi({ description: "Role to get effective rate for" }),
    })
    .openapi({ title: "GetCommissionRateQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CommissionConfigResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        role: z.enum(COMMISSION_ROLES),
        ratePerCup: z.number(),
        effectiveDate: z.string(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "CommissionConfigResponse" });

export const CommissionRateResponse = z
    .object({
        rate: z.number().openapi({ description: "Effective rate per cup for the role" }),
        effectiveDate: z.string().openapi({ description: "Date the rate became effective" }),
    })
    .openapi({ title: "CommissionRateResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UpsertCommissionConfigInput = z.infer<typeof UpsertCommissionConfigInput>;
export type GetCommissionRateQuery = z.infer<typeof GetCommissionRateQuery>;
export type CommissionConfigResponse = z.infer<typeof CommissionConfigResponse>;
export type CommissionRateResponse = z.infer<typeof CommissionRateResponse>;
