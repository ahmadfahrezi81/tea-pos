// lib/openapi/products.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateProductInput,
    UpdateProductInput,
    ListProductsQuery,
    ProductListResponse,
    CreateProductResponse,
    UpdateProductResponse,
    DeleteProductResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerProductRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/products
    registry.registerPath({
        method: "get",
        path: "/api/products",
        description: "Get products",
        summary: "Retrieve all products or only active ones",
        tags: ["Products"],
        request: {
            query: ListProductsQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: ProductListResponse },
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

    // Register POST /api/products
    registry.registerPath({
        method: "post",
        path: "/api/products",
        description: "Create product",
        summary: "Create a new product",
        tags: ["Products"],
        request: {
            body: {
                content: { "application/json": { schema: CreateProductInput } },
            },
        },
        responses: {
            200: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateProductResponse },
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

    // Register PUT /api/products
    registry.registerPath({
        method: "put",
        path: "/api/products",
        description: "Update product",
        summary: "Update an existing product",
        tags: ["Products"],
        request: {
            body: {
                content: { "application/json": { schema: UpdateProductInput } },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateProductResponse },
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
        },
    });

    // Register DELETE /api/products
    registry.registerPath({
        method: "delete",
        path: "/api/products",
        description: "Delete product",
        summary: "Delete a product by ID",
        tags: ["Products"],
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                id: { type: "string", format: "uuid" },
                            },
                            required: ["id"],
                        },
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DeleteProductResponse },
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
        },
    });
}
