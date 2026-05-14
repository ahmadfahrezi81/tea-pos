import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// ENUMS
// ============================================================================

export const ActivityLogType = z.enum([
    "order_created",
    "store_open",
    "daily_summary_closed",
    "balance_updated",
    "photo_uploaded",
    "photo_deleted",
    "photo_quantity_updated",
    "expense_created",
    "expense_updated",
    "expense_deleted",
    "customer_feedback_submitted",
    "session_transferred",
    "session_ended",
    "commission_config_updated",
    "payroll_entry_updated",
    "payroll_period_updated",
]);

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const ActivityLogInsert = z.object({
    tenantId: UUIDSchema,
    userId: UUIDSchema,
    storeId: UUIDSchema.optional(),
    type: ActivityLogType,
    refId: UUIDSchema.optional(),
    refTable: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const ActivityLogResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        userId: UUIDSchema,
        storeId: UUIDSchema.nullable(),
        type: ActivityLogType,
        refId: UUIDSchema.nullable(),
        refTable: z.string().nullable(),
        metadata: z.record(z.string(), z.unknown()),
        createdAt: z.string(),
    })
    .openapi({ title: "ActivityLogResponse" });

export const ActivityLogListResponse = z
    .object({
        logs: z.array(ActivityLogResponse),
    })
    .openapi({ title: "ActivityLogListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ActivityLogType = z.infer<typeof ActivityLogType>;
export type ActivityLogInsert = z.infer<typeof ActivityLogInsert>;
export type ActivityLogResponse = z.infer<typeof ActivityLogResponse>;
export type ActivityLogListResponse = z.infer<typeof ActivityLogListResponse>;
