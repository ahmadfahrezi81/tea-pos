// lib/openapi/userTenantAssignments.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    AssignUserToTenantInput,
    AssignUserToTenantResponse,
    ListUserTenantAssignmentsQuery,
    UserTenantAssignmentListResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerUserTenantAssignmentRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/user-tenant-assignments
    registry.registerPath({
        method: "get",
        path: "/api/user-tenant-assignments",
        description: "Get users in tenant",
        summary: "Retrieve all user assignments for a specific tenant",
        tags: ["User Tenant Assignments"],
        request: {
            query: ListUserTenantAssignmentsQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": {
                        schema: UserTenantAssignmentListResponse,
                    },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            403: {
                description: "Forbidden",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register POST /api/user-tenant-assignments
    registry.registerPath({
        method: "post",
        path: "/api/user-tenant-assignments",
        description: "Assign user to tenant",
        summary: "Assign a user to a tenant with a specific role",
        tags: ["User Tenant Assignments"],
        request: {
            body: {
                content: {
                    "application/json": { schema: AssignUserToTenantInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": {
                        schema: AssignUserToTenantResponse,
                    },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            403: {
                description: "Forbidden",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            404: {
                description: "Not Found",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            409: {
                description: "Conflict",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
