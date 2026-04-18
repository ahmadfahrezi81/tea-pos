// lib/openapi/tenantInvites.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateTenantInviteInput,
    CreateTenantInviteResponse,
    AcceptTenantInviteInput,
    AcceptTenantInviteResponse,
    ListTenantInvitesQuery,
    TenantInviteListResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerTenantInviteRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/tenant-invites
    registry.registerPath({
        method: "get",
        path: "/api/tenant-invites",
        description: "Get tenant invites",
        summary: "Retrieve all invites for a specific tenant",
        tags: ["Tenant Invites"],
        request: {
            query: ListTenantInvitesQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: TenantInviteListResponse },
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

    // Register POST /api/tenant-invites
    registry.registerPath({
        method: "post",
        path: "/api/tenant-invites",
        description: "Create tenant invite",
        summary: "Create an invite for a user to join a tenant",
        tags: ["Tenant Invites"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateTenantInviteInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateTenantInviteResponse },
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
            409: {
                description: "Conflict",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register PATCH /api/tenant-invites
    registry.registerPath({
        method: "patch",
        path: "/api/tenant-invites",
        description: "Accept tenant invite",
        summary: "Accept an invite and join a tenant",
        tags: ["Tenant Invites"],
        request: {
            body: {
                content: {
                    "application/json": { schema: AcceptTenantInviteInput },
                },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: AcceptTenantInviteResponse },
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
            410: {
                description: "Gone - Invite Expired",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
