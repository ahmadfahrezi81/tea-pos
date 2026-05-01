// lib/openapi/tenants.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateTenantInput,
    CreateTenantResponse,
    ListTenantsQuery,
    TenantListResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerTenantRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/tenants
    registry.registerPath({
        method: "get",
        path: "/api/tenants",
        description: "Get tenants for current user",
        summary: "Retrieve all tenants the current user has access to",
        tags: ["Tenants"],
        request: {
            query: ListTenantsQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: TenantListResponse },
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
        },
    });

    // Register POST /api/tenants
    registry.registerPath({
        method: "post",
        path: "/api/tenants",
        description: "Create tenant",
        summary: "Create a new tenant/workspace and assign creator as owner",
        tags: ["Tenants"],
        request: {
            body: {
                content: { "application/json": { schema: CreateTenantInput } },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateTenantResponse },
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
        },
    });
}
