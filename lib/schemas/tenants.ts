// lib/schemas/tenants.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateTenantInput, UpdateTenantInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListTenantsQuery, GetTenantQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: TenantResponse, CreateTenantResponse, TenantListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateTenantInput = z
    .object({
        name: z.string().min(1).max(255).openapi({
            description: "Tenant/workspace name",
            example: "Acme Corporation",
        }),
    })
    .openapi({ title: "CreateTenantInput" });

export const UpdateTenantInput = z
    .object({
        name: z.string().min(1).max(255).openapi({
            description: "Updated tenant/workspace name",
            example: "Acme Corp",
        }),
    })
    .openapi({ title: "UpdateTenantInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListTenantsQuery = z
    .object({
        userId: UUIDSchema.optional().openapi({
            description: "Filter tenants by user ID (defaults to current user)",
        }),
    })
    .openapi({ title: "ListTenantsQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const TenantResponse = z
    .object({
        id: UUIDSchema,
        name: z.string(),
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
        userTenantAssignments: z
            .array(
                z.object({
                    role: z.string(),
                })
            )
            .optional(),
    })
    .openapi({ title: "TenantResponse" });

export const TenantListResponse = z
    .object({
        tenants: z.array(TenantResponse),
    })
    .openapi({ title: "TenantListResponse" });

export const CreateTenantResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        tenantId: UUIDSchema,
        name: z.string().openapi({
            description: "The created tenant name",
            example: "Acme Corporation",
        }),
    })
    .openapi({ title: "CreateTenantResponse" });

export const UpdateTenantResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        tenantId: UUIDSchema,
        name: z.string().openapi({
            description: "The updated tenant name",
            example: "Acme Corp",
        }),
    })
    .openapi({ title: "UpdateTenantResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateTenantInput = z.infer<typeof CreateTenantInput>;
export type UpdateTenantInput = z.infer<typeof UpdateTenantInput>;
export type ListTenantsQuery = z.infer<typeof ListTenantsQuery>;
export type TenantResponse = z.infer<typeof TenantResponse>;
export type TenantListResponse = z.infer<typeof TenantListResponse>;
export type CreateTenantResponse = z.infer<typeof CreateTenantResponse>;
export type UpdateTenantResponse = z.infer<typeof UpdateTenantResponse>;

export type Tenant = z.infer<typeof TenantResponse>;
