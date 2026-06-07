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
    "store_opened",
    "store_closed",
    "opening_balance_updated",
    "summary_photo_uploaded",
    "summary_photo_deleted",
    "summary_photo_updated",
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

// ============================================================================
// METADATA CONTRACTS
// ============================================================================

// Typed metadata per event type — enforced at the write side via createLogger.
// Keeps callsites honest: log("store_closed", { metadata: { wrong_field: 1 } }) is a TS error.
export type ActivityLogMetadataMap = {
    order_created:              { total_amount: number; total_cups: number; payment_method: string };
    store_opened:               { opening_balance?: number; date?: string; resumed?: boolean };
    store_closed:               { total_sales: number; variance: number | null };
    opening_balance_updated:    { opening_balance: number };
    summary_photo_uploaded:     { photo_url: string; slot: string; quantity?: unknown };
    summary_photo_deleted:      { photo_url: string; slot: string };
    summary_photo_updated:      { slot: string; quantity?: unknown };
    expense_created:            { amount: number; type: string };
    expense_updated:            { amount: number; type: string };
    expense_deleted:            { amount: number; type: string };
    customer_feedback_submitted:{ location_name: string; has_notes: boolean };
    session_transferred:        { previous_session_id: string; daily_summary_id: string };
    session_ended:              Record<string, never>;
    commission_config_updated:  { user_id: string; rate_per_cup: number; effective_date: string };
    payroll_entry_updated:      { user_id?: string; total_cups?: number; rate_per_cup?: number; gross_pay?: number; status?: string };
    payroll_period_updated:     { status: string };
    supply_request_created:     { type: string };
    incident_report_created:    { type: string };
    reimbursement_submitted:    { type: string; amount: number; date: string };
    reimbursement_status_updated: { status: string };
    payroll_payout_updated:     { status: string };
};

// ============================================================================
// DAY ACTIVITY SEGMENT
// ============================================================================

// One row from the day activity timeline — no grouping, no discriminated kind.
export const EventSegment = z.object({
    id: UUIDSchema,
    type: ActivityLogType,
    createdAt: z.string(),
    userName: z.string(),
    metadata: z.record(z.string(), z.unknown()),
    refId: UUIDSchema.nullable(),
    refTable: z.string().nullable(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ActivityLogType = z.infer<typeof ActivityLogType>;
export type ActivityLogInsert = z.infer<typeof ActivityLogInsert>;
export type ActivityLogResponse = z.infer<typeof ActivityLogResponse>;
export type ActivityLogListResponse = z.infer<typeof ActivityLogListResponse>;
export type EventSegment = z.infer<typeof EventSegment>;
