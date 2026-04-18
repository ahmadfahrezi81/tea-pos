// lib/schemas/daily-summary-photos.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

// ============================================================================
// CONSTANTS
// ============================================================================

export const PHOTO_TYPES = [
    "opening",
    "closing",
    "closing:ice",
    "closing:syrup",
    "closing:bags",
    "closing:cups",
    "closing:tea",
    "expense",
] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

// ============================================================================
// QUANTITY SCHEMA
// ============================================================================

export const PhotoQuantity = z
    .object({
        value: z.number().min(0),
        unit: z.string(),
    })
    .openapi({ title: "PhotoQuantity" });

export type PhotoQuantity = z.infer<typeof PhotoQuantity>;

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
        quantity: PhotoQuantity.nullable().optional().openapi({
            description:
                "Optional quantity for this photo e.g. { value: 5, unit: 'pcs' }",
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
        quantity: PhotoQuantity.nullable().optional(),
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
// FRONTEND TYPES
// ============================================================================

export interface SlottedPhoto {
    type: PhotoType;
    file: File;
    preview: string;
    quantity?: { value: number; unit: string } | null;
}

export interface SavedSlottedPhoto {
    id: string;
    type: PhotoType;
    url: string;
    quantity?: { value: number; unit: string } | null;
}

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
