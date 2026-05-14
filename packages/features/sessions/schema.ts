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
        claimCode: z.string().length(6).openapi({
            description: "6-character claim code of the active session",
            example: "A1B2C3",
        }),
    })
    .openapi({ title: "TransferSessionInput" });

export const GetActiveSessionQuery = z
    .object({
        storeId: UUIDSchema.openapi({ description: "Store ID to query active session for" }),
    })
    .openapi({ title: "GetActiveSessionQuery" });

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
    })
    .openapi({ title: "StoreSessionResponse" });

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
export type StoreSessionResponse = z.infer<typeof StoreSessionResponse>;
export type OpenStoreResponse = z.infer<typeof OpenStoreResponse>;
