// lib/openapi/orders.ts - Route registrations (separate from docs route)
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateOrderSchema,
    CreateOrderResponseSchema,
    GetOrdersQuerySchema,
    OrdersResponseSchema,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerOrderRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/orders
    registry.registerPath({
        method: "get",
        path: "/api/orders",
        description: "Get orders",
        summary: "Retrieve orders with optional filtering",
        tags: ["Orders"],
        request: {
            query: GetOrdersQuerySchema,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: OrdersResponseSchema },
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

    // Register POST /api/orders
    registry.registerPath({
        method: "post",
        path: "/api/orders",
        description: "Create order",
        summary: "Create a new order with items",
        tags: ["Orders"],
        request: {
            body: {
                content: { "application/json": { schema: CreateOrderSchema } },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateOrderResponseSchema },
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
