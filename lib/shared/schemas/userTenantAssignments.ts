// lib/schemas/userTenantAssignments.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: AssignUserToTenantInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListUserTenantAssignmentsQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: UserTenantAssignmentResponse, AssignUserToTenantResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const AssignUserToTenantInput = z
    .object({
        userId: UUIDSchema.openapi({
            description: "User ID to assign to tenant",
        }),
        tenantId: UUIDSchema.openapi({
            description: "Tenant ID",
        }),
        role: z
            .enum(["owner", "manager", "staff"]) // Match your DB constraint
            .default("staff")
            .openapi({
                description: "Role for the user in this tenant",
                example: "staff",
            }),
    })
    .openapi({ title: "AssignUserToTenantInput" });

export const UpdateUserTenantAssignmentInput = z
    .object({
        role: z.enum(["owner", "manager", "staff"]).openapi({
            description: "Updated role for the user",
            example: "owner",
        }),
    })
    .openapi({ title: "UpdateUserTenantAssignmentInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListUserTenantAssignmentsQuery = z
    .object({
        tenantId: UUIDSchema.openapi({
            description: "Tenant ID to filter assignments",
        }),
    })
    .openapi({ title: "ListUserTenantAssignmentsQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const UserTenantAssignmentResponse = z
    .object({
        id: UUIDSchema,
        userId: UUIDSchema,
        tenantId: UUIDSchema,
        role: z.string(),
        createdAt: z.string().nullable(),
        profiles: z
            .object({
                fullName: z.string(),
                email: z.string(),
                phoneNumber: z.string().nullable(),
                status: z.enum(["active", "inactive", "pending", "suspended"]),
            })
            .nullable(),
    })
    .openapi({ title: "UserTenantAssignmentResponse" });

export const UserTenantAssignmentListResponse = z
    .object({
        assignments: z.array(UserTenantAssignmentResponse),
    })
    .openapi({ title: "UserTenantAssignmentListResponse" });

export const AssignUserToTenantResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        assignmentId: UUIDSchema,
        userId: UUIDSchema,
        tenantId: UUIDSchema,
        role: z.string().openapi({
            description: "Assigned role",
            example: "member",
        }),
    })
    .openapi({ title: "AssignUserToTenantResponse" });

export const UpdateUserTenantAssignmentResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        assignmentId: UUIDSchema,
        role: z.string().openapi({
            description: "Updated role",
            example: "admin",
        }),
    })
    .openapi({ title: "UpdateUserTenantAssignmentResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AssignUserToTenantInput = z.infer<typeof AssignUserToTenantInput>;
export type UpdateUserTenantAssignmentInput = z.infer<
    typeof UpdateUserTenantAssignmentInput
>;
export type ListUserTenantAssignmentsQuery = z.infer<
    typeof ListUserTenantAssignmentsQuery
>;
export type UserTenantAssignmentResponse = z.infer<
    typeof UserTenantAssignmentResponse
>;
export type UserTenantAssignmentListResponse = z.infer<
    typeof UserTenantAssignmentListResponse
>;
export type AssignUserToTenantResponse = z.infer<
    typeof AssignUserToTenantResponse
>;
export type UpdateUserTenantAssignmentResponse = z.infer<
    typeof UpdateUserTenantAssignmentResponse
>;

export type UserTenantAssignment = z.infer<typeof UserTenantAssignmentResponse>;
