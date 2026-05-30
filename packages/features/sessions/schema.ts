import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const OpenStoreInput = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store to open" }),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .openapi({ description: "Date for this session", example: "2026-05-14" }),
        openingBalance: z.number().min(0).optional().openapi({
            description: "Opening cash balance",
            example: 100000,
        }),
        openingCashBreakdown: z.record(z.string(), z.number()).nullable().optional(),
    })
    .openapi({ title: "OpenStoreInput" });

export const TransferSessionInput = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store whose session to transfer" }),
        claimCode: z.string().regex(/^\d{2}$/, "Must be a 2-digit number").openapi({
            description: "2-digit claim code of the active session",
            example: "42",
        }),
    })
    .openapi({ title: "TransferSessionInput" });

export const GetActiveSessionQuery = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store ID to query active session for" }),
    })
    .openapi({ title: "GetActiveSessionQuery" });

export const GetGateStateQuery = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store ID to query gate state for" }),
    })
    .openapi({ title: "GetGateStateQuery" });

export const ResumeSessionInput = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store to resume session for" }),
        summaryId: UUIDSchema.openapi({ description: "Existing open daily summary ID" }),
    })
    .openapi({ title: "ResumeSessionInput" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const StoreSessionResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        storeId: UUIDSchema,
        dailySummaryId: UUIDSchema,
        userId: UUIDSchema,
        claimCode: z.string(),
        startedAt: z.string(),
        endedAt: z.string().nullable(),
        status: z.enum(["active", "ended"]),
        previousSessionId: UUIDSchema.nullable(),
        createdAt: z.string().nullable(),
        userName: z.string().nullable(),
        userAvatarUrl: z.string().nullable(),
    })
    .openapi({ title: "StoreSessionResponse" });

export const GateStateResponse = z
    .discriminatedUnion("gate", [
        z.object({ gate: z.literal("no_summary") }),
        z.object({ gate: z.literal("no_session"), summaryId: UUIDSchema }),
        z.object({ gate: z.literal("open"), session: StoreSessionResponse }),
        z.object({ gate: z.literal("closed"), summaryId: UUIDSchema, closedAt: z.string() }),
    ])
    .openapi({ title: "GateStateResponse" });

export const ResumeSessionResponse = z
    .object({
        session: StoreSessionResponse,
    })
    .openapi({ title: "ResumeSessionResponse" });

export const OpenStoreResponse = z
    .object({
        session: StoreSessionResponse,
        dailySummary: z.object({
            id: UUIDSchema,
            storeId: UUIDSchema,
            date: z.string(),
            openingBalance: z.number(),
            tenantId: UUIDSchema.nullable(),
        }),
    })
    .openapi({ title: "OpenStoreResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OpenStoreInput = z.infer<typeof OpenStoreInput>;
export type TransferSessionInput = z.infer<typeof TransferSessionInput>;
export type GetActiveSessionQuery = z.infer<typeof GetActiveSessionQuery>;
export type GetGateStateQuery = z.infer<typeof GetGateStateQuery>;
export type ResumeSessionInput = z.infer<typeof ResumeSessionInput>;
export type StoreSessionResponse = z.infer<typeof StoreSessionResponse>;
export type GateStateResponse = z.infer<typeof GateStateResponse>;
export type ResumeSessionResponse = z.infer<typeof ResumeSessionResponse>;
export type OpenStoreResponse = z.infer<typeof OpenStoreResponse>;
