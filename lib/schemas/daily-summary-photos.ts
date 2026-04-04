// lib/schemas/daily-summary-photos.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

// ============================================================================
// CONSTANTS
// ============================================================================

export const PHOTO_TYPES = ["opening", "closing", "expense"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const UploadSummaryPhotoInput = z
    .object({
        dailySummaryId: UUIDSchema.openapi({
            description: "ID of the daily summary",
        }),
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        type: z.enum(PHOTO_TYPES).openapi({
            description: "Type of photo — opening, closing, or expense",
        }),
        expenseId: UUIDSchema.nullable().optional().openapi({
            description: "ID of the expense (required when type is expense)",
        }),
    })
    .openapi({ title: "UploadSummaryPhotoInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListSummaryPhotosQuery = z
    .object({
        dailySummaryId: UUIDSchema.optional(),
        expenseId: UUIDSchema.optional(),
        type: z.enum(PHOTO_TYPES).optional(),
    })
    .openapi({ title: "ListSummaryPhotosQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const SummaryPhotoResponse = z
    .object({
        id: UUIDSchema,
        dailySummaryId: UUIDSchema.nullable(),
        expenseId: UUIDSchema.nullable(),
        storeId: UUIDSchema,
        tenantId: UUIDSchema.nullable(),
        type: z.enum(PHOTO_TYPES),
        url: z.string(),
        createdAt: z.string(),
    })
    .openapi({ title: "SummaryPhotoResponse" });

export const UploadSummaryPhotoResponse = z
    .object({
        success: z.boolean(),
        photo: SummaryPhotoResponse,
    })
    .openapi({ title: "UploadSummaryPhotoResponse" });

export const DeleteSummaryPhotoResponse = z
    .object({
        success: z.boolean(),
        photo: SummaryPhotoResponse,
    })
    .openapi({ title: "DeleteSummaryPhotoResponse" });

export const ListSummaryPhotosResponse = z
    .object({
        photos: z.array(SummaryPhotoResponse),
    })
    .openapi({ title: "ListSummaryPhotosResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UploadSummaryPhotoInput = z.infer<typeof UploadSummaryPhotoInput>;
export type ListSummaryPhotosQuery = z.infer<typeof ListSummaryPhotosQuery>;
export type SummaryPhotoResponse = z.infer<typeof SummaryPhotoResponse>;
export type UploadSummaryPhotoResponse = z.infer<
    typeof UploadSummaryPhotoResponse
>;
export type DeleteSummaryPhotoResponse = z.infer<
    typeof DeleteSummaryPhotoResponse
>;
export type ListSummaryPhotosResponse = z.infer<
    typeof ListSummaryPhotosResponse
>;
