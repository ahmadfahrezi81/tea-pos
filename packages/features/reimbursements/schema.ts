import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

export const REIMBURSEMENT_TYPES = ["mobile_data", "lunch", "gasoline"] as const;
export type ReimbursementType = (typeof REIMBURSEMENT_TYPES)[number];

export const REIMBURSEMENT_TYPE_LABELS: Record<ReimbursementType, string> = {
    mobile_data: "Mobile Data",
    lunch: "Lunch",
    gasoline: "Gasoline",
};

export const REIMBURSEMENT_TYPES_BY_ROLE: Record<string, ReimbursementType[]> = {
    USER: ["mobile_data", "lunch"],
    DRIVER: ["mobile_data", "lunch", "gasoline"],
    SUPPLIER: ["mobile_data", "lunch"],
};

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateReimbursementInput = z
    .object({
        type: z.enum(REIMBURSEMENT_TYPES),
        amount: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
        storeId: UUIDSchema.optional(),
        notes: z.string().max(500).optional(),
        photoUrl: z.string().url().optional(),
    })
    .openapi({ title: "CreateReimbursementInput" });

export const ListReimbursementsQuery = z
    .object({
        limit: z.coerce.number().int().positive().optional(),
    })
    .openapi({ title: "ListReimbursementsQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ReimbursementResponse = z
    .object({
        id: z.string(),
        userId: z.string(),
        storeId: z.string().nullable(),
        payrollPeriodId: z.string().nullable(),
        type: z.enum(REIMBURSEMENT_TYPES),
        amount: z.number(),
        date: z.string(),
        notes: z.string().nullable(),
        photoUrl: z.string().nullable(),
        status: z.enum(["pending", "approved", "rejected", "paid"]),
        createdAt: z.string(),
    })
    .openapi({ title: "ReimbursementResponse" });

export const ReimbursementListResponse = z
    .object({ claims: z.array(ReimbursementResponse) })
    .openapi({ title: "ReimbursementListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateReimbursementInput = z.infer<typeof CreateReimbursementInput>;
export type ListReimbursementsQuery = z.infer<typeof ListReimbursementsQuery>;
export type ReimbursementResponse = z.infer<typeof ReimbursementResponse>;
export type ReimbursementListResponse = z.infer<typeof ReimbursementListResponse>;
