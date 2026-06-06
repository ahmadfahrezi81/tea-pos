import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListActivityLogsQuery = z.object({
    storeId: UUIDSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type ListActivityLogsQuery = z.infer<typeof ListActivityLogsQuery>;

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
    "supply_request_created",
    "incident_report_created",
    "reimbursement_submitted",
    "reimbursement_status_updated",
    "payroll_payout_updated",
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

// Curated subset for timeline display — no sensitive metadata exposed
export const TimelineEventResponse = z.object({
    id: UUIDSchema,
    type: ActivityLogType,
    createdAt: z.string(),
});
export type TimelineEventResponse = z.infer<typeof TimelineEventResponse>;

export const ActivityLogListResponse = z
    .object({
        logs: z.array(ActivityLogResponse),
    })
    .openapi({ title: "ActivityLogListResponse" });

// Day activity timeline — segmented view
export const EventSegment = z.object({
    kind: z.literal("event"),
    id: UUIDSchema,
    type: ActivityLogType,
    createdAt: z.string(),
    userName: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    refId: UUIDSchema.nullable(),
    refTable: z.string().nullable(),
});

export const OrdersSegment = z.object({
    kind: z.literal("orders"),
    startTime: z.string(),
    endTime: z.string(),
    count: z.number(),
    totalSales: z.number(),
});

export const DaySegment = z.discriminatedUnion("kind", [EventSegment, OrdersSegment]);
export const DayActivityResponse = z.object({ segments: z.array(DaySegment) });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ActivityLogType = z.infer<typeof ActivityLogType>;
export type ActivityLogInsert = z.infer<typeof ActivityLogInsert>;
export type ActivityLogResponse = z.infer<typeof ActivityLogResponse>;
export type ActivityLogListResponse = z.infer<typeof ActivityLogListResponse>;
export type EventSegment = z.infer<typeof EventSegment>;
export type OrdersSegment = z.infer<typeof OrdersSegment>;
export type DaySegment = z.infer<typeof DaySegment>;
export type DayActivityResponse = z.infer<typeof DayActivityResponse>;
