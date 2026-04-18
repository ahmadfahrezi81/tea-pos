// lib/openapi/userStoreAssignments.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateAssignmentInput,
    UpdateAssignmentInput,
    DeleteAssignmentQuery,
    CreateAssignmentResponse,
    UpdateAssignmentResponse,
    DeleteAssignmentResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerAssignmentRoutes(registry: OpenAPIRegistry) {
    // Register POST /api/stores/userStoreAssignments
    registry.registerPath({
        method: "post",
        path: "/api/stores/assignments",
        description: "Create store assignment",
        summary: "Assign a user to a store with a specific role",
        tags: ["User Store Assignments"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateAssignmentInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateAssignmentResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            409: {
                description: "Conflict - Assignment already exists",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register PUT /api/stores/userStoreAssignments
    registry.registerPath({
        method: "put",
        path: "/api/stores/assignments",
        description: "Update store assignment",
        summary:
            "Update an existing store assignment (mainly for default flag)",
        tags: ["User Store Assignments"],
        request: {
            body: {
                content: {
                    "application/json": { schema: UpdateAssignmentInput },
                },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateAssignmentResponse },
                },
            },
            400: {
                description: "Bad Request",
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
        },
    });

    // Register DELETE /api/stores/userStoreAssignments
    registry.registerPath({
        method: "delete",
        path: "/api/stores/assignments",
        description: "Delete store assignment",
        summary: "Remove a user's assignment from a store",
        tags: ["User Store Assignments"],
        request: {
            query: DeleteAssignmentQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DeleteAssignmentResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
