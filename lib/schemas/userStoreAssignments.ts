// lib/schemas/userTenantAssignments.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateAssignmentInput, UpdateAssignmentInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListAssignmentsQuery, GetAssignmentQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: AssignmentResponse, CreateAssignmentResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateAssignmentInput = z
    .object({
        userId: UUIDSchema.openapi({
            description: "ID of the user to assign",
        }),
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        role: z.enum(["seller", "manager"]).openapi({
            description: "Role for this assignment",
            example: "seller",
        }),
        isDefault: z.boolean().optional().openapi({
            description: "Whether this is the default store for the user",
            example: false,
        }),
    })
    .openapi({ title: "CreateAssignmentInput" });

export const UpdateAssignmentInput = z
    .object({
        userId: UUIDSchema.openapi({
            description: "ID of the user",
        }),
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        role: z.enum(["seller", "manager"]).openapi({
            description: "Role for this assignment",
        }),
        isDefault: z.boolean().openapi({
            description: "Whether this is the default store for the user",
        }),
    })
    .openapi({ title: "UpdateAssignmentInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const DeleteAssignmentQuery = z
    .object({
        userId: UUIDSchema.openapi({
            description: "ID of the user",
        }),
        storeId: UUIDSchema.openapi({
            description: "ID of the store",
        }),
        role: z.enum(["seller", "manager"]).openapi({
            description: "Role for this assignment",
        }),
    })
    .openapi({ title: "DeleteAssignmentQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const AssignmentResponse = z
    .object({
        id: UUIDSchema,
        userId: UUIDSchema,
        storeId: UUIDSchema,
        role: z.string(),
        isDefault: z.boolean(),
        createdAt: z.string().nullable(),
    })
    .openapi({ title: "AssignmentResponse" });

export const CreateAssignmentResponse = AssignmentResponse.openapi({
    title: "CreateAssignmentResponse",
});

export const UpdateAssignmentResponse = AssignmentResponse.openapi({
    title: "UpdateAssignmentResponse",
});

export const DeleteAssignmentResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
    })
    .openapi({ title: "DeleteAssignmentResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentInput>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentInput>;
export type DeleteAssignmentQuery = z.infer<typeof DeleteAssignmentQuery>;
export type AssignmentResponse = z.infer<typeof AssignmentResponse>;
export type CreateAssignmentResponse = z.infer<typeof CreateAssignmentResponse>;
export type UpdateAssignmentResponse = z.infer<typeof UpdateAssignmentResponse>;
export type DeleteAssignmentResponse = z.infer<typeof DeleteAssignmentResponse>;

export type Assignment = z.infer<typeof AssignmentResponse>;
