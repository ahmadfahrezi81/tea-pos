// lib/schemas/tenantInvites.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateTenantInviteInput, AcceptTenantInviteInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListTenantInvitesQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: TenantInviteResponse, CreateTenantInviteResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateTenantInviteInput = z
    .object({
        tenantId: UUIDSchema.openapi({
            description: "Tenant ID to invite user to",
        }),
        invitedEmail: z.string().email().openapi({
            description: "Email address of the person to invite",
            example: "user@example.com",
        }),
    })
    .openapi({ title: "CreateTenantInviteInput" });

export const AcceptTenantInviteInput = z
    .object({
        token: z.string().min(1).openapi({
            description: "Invite token from the invitation link",
            example: "abc123def456",
        }),
    })
    .openapi({ title: "AcceptTenantInviteInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListTenantInvitesQuery = z
    .object({
        tenantId: UUIDSchema.openapi({
            description: "Tenant ID to filter invites",
        }),
    })
    .openapi({ title: "ListTenantInvitesQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const TenantInviteResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        invitedEmail: z.string().nullable(),
        token: z.string().nullable(),
        createdBy: UUIDSchema.nullable(),
        acceptedBy: UUIDSchema.nullable(),
        expiresAt: z.string().nullable(),
        createdAt: z.string().nullable(),
        tenants: z
            .object({
                name: z.string(),
            })
            .nullable(),
        createdByProfile: z
            .object({
                fullName: z.string(),
                email: z.string(),
            })
            .nullable(),
        acceptedByProfile: z
            .object({
                fullName: z.string(),
                email: z.string(),
            })
            .nullable(),
    })
    .openapi({ title: "TenantInviteResponse" });

export const TenantInviteListResponse = z
    .object({
        invites: z.array(TenantInviteResponse),
    })
    .openapi({ title: "TenantInviteListResponse" });

export const CreateTenantInviteResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        inviteId: UUIDSchema,
        token: z.string().openapi({
            description: "Invite token to send to the user",
            example: "abc123def456",
        }),
        expiresAt: z.string().openapi({
            description: "Expiration timestamp (ISO 8601)",
            example: "2025-10-10T12:00:00Z",
        }),
    })
    .openapi({ title: "CreateTenantInviteResponse" });

export const AcceptTenantInviteResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        tenantId: UUIDSchema,
        tenantName: z.string().openapi({
            description: "Name of the tenant you joined",
            example: "Acme Corporation",
        }),
        role: z.string().openapi({
            description: "Your role in the tenant",
            example: "member",
        }),
    })
    .openapi({ title: "AcceptTenantInviteResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateTenantInviteInput = z.infer<typeof CreateTenantInviteInput>;
export type AcceptTenantInviteInput = z.infer<typeof AcceptTenantInviteInput>;
export type ListTenantInvitesQuery = z.infer<typeof ListTenantInvitesQuery>;
export type TenantInviteResponse = z.infer<typeof TenantInviteResponse>;
export type TenantInviteListResponse = z.infer<typeof TenantInviteListResponse>;
export type CreateTenantInviteResponse = z.infer<
    typeof CreateTenantInviteResponse
>;
export type AcceptTenantInviteResponse = z.infer<
    typeof AcceptTenantInviteResponse
>;

export type TenantInvite = z.infer<typeof TenantInviteResponse>;
