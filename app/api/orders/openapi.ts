// app/api/orders/openapi.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import {
    CreateOrderSchema,
    CreateOrderResponseSchema,
    GetOrdersResponseSchema,
} from "./schema";

const app = new OpenAPIHono();

// -------------------------------
// Register OpenAPI routes
// -------------------------------
app.openapi(
    {
        method: "get",
        path: "/api/orders",
        responses: {
            200: {
                description: "List orders",
                content: {
                    "application/json": {
                        schema: GetOrdersResponseSchema,
                    },
                },
            },
        },
    },
    async (c) => c.json({ orders: [] }) // dummy handler
);

app.openapi(
    {
        method: "post",
        path: "/api/orders",
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: CreateOrderSchema,
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Order created",
                content: {
                    "application/json": {
                        schema: CreateOrderResponseSchema,
                    },
                },
            },
        },
    },
    async (c) => c.json({ success: true, orderId: "uuid", totalAmount: 100 }) // dummy handler
);

export default app;
