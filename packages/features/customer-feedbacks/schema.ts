// lib/shared/schemas/customer-feedbacks.ts
import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *
 * Query Schemas (for GET request parameters):
 *   - Format: List{Entity}Query
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateCustomerFeedbackInput = z
    .object({
        locationName: z.string().min(1).openapi({
            description: "Full location string from Mapbox",
            example: "Ciomas, Bogor, West Java, Indonesia",
        }),
        locationDisplay: z.string().min(1).openapi({
            description: "Short display name shown in UI",
            example: "Ciomas",
        }),
        latitude: z.number().openapi({
            description: "Latitude of the selected location",
            example: -6.602,
        }),
        longitude: z.number().openapi({
            description: "Longitude of the selected location",
            example: 106.765,
        }),
        notes: z.string().nullable().optional().openapi({
            description: "Feedback notes from the seller",
            example: "Customer mentioned they prefer a sweeter taste",
        }),
    })
    .openapi({ title: "CreateCustomerFeedbackInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListCustomerFeedbacksQuery = z
    .object({
        tenantId: UUIDSchema.optional(),
        userId: UUIDSchema.optional(),
        limit: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .openapi({
                description: "Number of records to return",
                example: 20,
            }),
        offset: z.coerce.number().int().min(0).default(0).optional().openapi({
            description: "Number of records to skip",
            example: 0,
        }),
    })
    .openapi({ title: "ListCustomerFeedbacksQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CustomerFeedbackResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        userId: UUIDSchema,
        userName: z.string().nullable().openapi({
            description: "Full name of the user who submitted the feedback",
            example: "Ahmad Fahrezi",
        }),
        locationName: z.string(),
        locationDisplay: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        notes: z.string().nullable(),
        createdAt: z.string(),
    })
    .openapi({ title: "CustomerFeedbackResponse" });

export const CreateCustomerFeedbackResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        feedback: CustomerFeedbackResponse,
    })
    .openapi({ title: "CreateCustomerFeedbackResponse" });

export const ListCustomerFeedbacksResponse = z
    .object({
        feedbacks: z.array(CustomerFeedbackResponse),
        total: z.number().int().openapi({
            description: "Total number of records",
            example: 42,
        }),
    })
    .openapi({ title: "ListCustomerFeedbacksResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateCustomerFeedbackInput = z.infer<
    typeof CreateCustomerFeedbackInput
>;
export type ListCustomerFeedbacksQuery = z.infer<
    typeof ListCustomerFeedbacksQuery
>;
export type CustomerFeedbackResponse = z.infer<typeof CustomerFeedbackResponse>;
export type CreateCustomerFeedbackResponse = z.infer<
    typeof CreateCustomerFeedbackResponse
>;
export type ListCustomerFeedbacksResponse = z.infer<
    typeof ListCustomerFeedbacksResponse
>;
