// lib/schemas/stores.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateStoreInput, UpdateStoreInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListStoresQuery, GetStoreQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: StoreResponse, CreateStoreResponse, StoreListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// STORE STATUS ENUM
// ============================================================================

export const StoreStatus = z.enum(["active", "fake", "inactive"]);
export type StoreStatus = z.infer<typeof StoreStatus>;

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateStoreInput = z
    .object({
        name: z.string().min(1).max(255).openapi({
            description: "Store name",
            example: "Downtown Branch",
        }),
        address: z.string().max(500).nullable().optional().openapi({
            description: "Store address",
            example: "123 Main St, Jakarta",
        }),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        status: StoreStatus.openapi({
            description: "Store status",
            example: "active",
        }),
    })
    .openapi({ title: "CreateStoreInput" });

export const UpdateStoreInput = z
    .object({
        id: UUIDSchema,
        name: z.string().min(1).max(255).openapi({
            description: "Store name",
            example: "Downtown Branch",
        }),
        address: z.string().max(500).nullable().optional().openapi({
            description: "Store address",
            example: "123 Main St, Jakarta",
        }),
        status: StoreStatus.optional().openapi({
            description: "Store status",
            example: "active",
        }),
    })
    .openapi({ title: "UpdateStoreInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListStoresQuery = z
    .object({
        userId: UUIDSchema.optional().openapi({
            description: "Filter stores by user assignments",
        }),
    })
    .openapi({ title: "ListStoresQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const StoreAssignmentResponse = z
    .object({
        userId: UUIDSchema,
        role: z.string(),
        isDefault: z.boolean(),
    })
    .openapi({ title: "StoreAssignmentResponse" });

export const UserResponse = z
    .object({
        id: UUIDSchema,
        fullName: z.string(),
        email: z.string().email(),
    })
    .openapi({ title: "UserResponse" });

export const StoreResponse = z
    .object({
        id: UUIDSchema,
        name: z.string(),
        address: z.string().nullable(),
        latitude: z.number().nullable().optional(),
        longitude: z.number().nullable().optional(),
        status: StoreStatus,
        tenantId: UUIDSchema,
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "StoreResponse" });

export const StoreListResponse = z
    .object({
        stores: z.array(StoreResponse),
        users: z.array(UserResponse),
        assignments: z
            .record(z.string(), z.array(StoreAssignmentResponse))
            .openapi({
                description: "Store assignments grouped by store ID",
            }),
    })
    .openapi({ title: "StoreListResponse" });

export const CreateStoreResponse = StoreResponse.openapi({
    title: "CreateStoreResponse",
});

export const UpdateStoreResponse = StoreResponse.openapi({
    title: "UpdateStoreResponse",
});

export const DeleteStoreResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
    })
    .openapi({ title: "DeleteStoreResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateStoreInput = z.infer<typeof CreateStoreInput>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreInput>;
export type ListStoresQuery = z.infer<typeof ListStoresQuery>;
export type StoreAssignmentResponse = z.infer<typeof StoreAssignmentResponse>;
export type UserResponse = z.infer<typeof UserResponse>;
export type StoreResponse = z.infer<typeof StoreResponse>;
export type StoreListResponse = z.infer<typeof StoreListResponse>;
export type CreateStoreResponse = z.infer<typeof CreateStoreResponse>;
export type UpdateStoreResponse = z.infer<typeof UpdateStoreResponse>;
export type DeleteStoreResponse = z.infer<typeof DeleteStoreResponse>;

export type Store = z.infer<typeof StoreResponse>;
