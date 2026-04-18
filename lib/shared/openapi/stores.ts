// lib/openapi/stores.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateStoreInput,
    UpdateStoreInput,
    ListStoresQuery,
    StoreListResponse,
    CreateStoreResponse,
    UpdateStoreResponse,
    DeleteStoreResponse,
    ErrorResponseSchema,
    DeleteByIdQuery,
} from "../schemas/index";

export function registerStoreRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/store
    registry.registerPath({
        method: "get",
        path: "/api/store",
        description: "Get stores",
        summary:
            "Retrieve stores with assignments, optionally filtered by user",
        tags: ["Stores"],
        request: {
            query: ListStoresQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: StoreListResponse },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register POST /api/store
    registry.registerPath({
        method: "post",
        path: "/api/store",
        description: "Create store",
        summary: "Create a new store",
        tags: ["Stores"],
        request: {
            body: {
                content: { "application/json": { schema: CreateStoreInput } },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateStoreResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register PUT /api/store
    registry.registerPath({
        method: "put",
        path: "/api/store",
        description: "Update store",
        summary: "Update an existing store",
        tags: ["Stores"],
        request: {
            body: {
                content: { "application/json": { schema: UpdateStoreInput } },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateStoreResponse },
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
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // Register DELETE /api/store
    registry.registerPath({
        method: "delete",
        path: "/api/store",
        description: "Delete store",
        summary: "Delete a store by ID",
        tags: ["Stores"],
        // request: {
        //     query: {
        //         type: "object",
        //         properties: {
        //             id: { type: "string", format: "uuid" },
        //         },
        //         required: ["id"],
        //     },
        // },
        request: {
            query: DeleteByIdQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DeleteStoreResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
