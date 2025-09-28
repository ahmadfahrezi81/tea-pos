// lib/schemas.ts - All your schemas in one file
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// Extend Zod with OpenAPI support
extendZodWithOpenApi(z);

// Common schemas
export const UUIDSchema = z.uuid().openapi({
    description: "UUID identifier",
    example: "123e4567-e89b-12d3-a456-426614174000",
});

// Order schemas
export const CreateOrderItemSchema = z
    .object({
        productId: UUIDSchema,
        quantity: z.number().int().min(1).max(1000).openapi({
            description: "Quantity of items",
            example: 2,
        }),
        unitPrice: z.number().min(0).openapi({
            description: "Price per unit",
            example: 15.99,
        }),
    })
    .openapi({ title: "CreateOrderItem" });

export const CreateOrderSchema = z
    .object({
        storeId: UUIDSchema,
        items: z.array(CreateOrderItemSchema).min(1).openapi({
            description: "Array of order items",
        }),
    })
    .openapi({ title: "CreateOrder" });

export const OrderResponseSchema = z
    .object({
        success: z.boolean().openapi({ example: true }),
        orderId: UUIDSchema,
        totalAmount: z.number().openapi({ example: 31.98 }),
    })
    .openapi({ title: "OrderResponse" });

export const GetOrdersQuerySchema = z
    .object({
        storeId: UUIDSchema.optional().openapi({
            description: "Filter by store ID",
        }),
    })
    .openapi({ title: "GetOrdersQuery" });

export const OrderWithDetailsSchema = z
    .object({
        id: UUIDSchema,
        store_id: UUIDSchema,
        user_id: UUIDSchema,
        total_amount: z.number(),
        created_at: z.string().nullable(),
        stores: z.object({ name: z.string() }).nullable(),
        profiles: z.object({ full_name: z.string() }).nullable(),
        order_items: z.array(
            z.object({
                id: UUIDSchema,
                quantity: z.number(),
                unit_price: z.number(),
                total_price: z.number(),
                products: z.object({ name: z.string() }).nullable(),
            })
        ),
    })
    .openapi({ title: "OrderWithDetails" });

export const OrdersResponseSchema = z
    .object({
        orders: z.array(OrderWithDetailsSchema),
    })
    .openapi({ title: "OrdersResponse" });

export const ErrorResponseSchema = z
    .object({
        error: z.string().openapi({ example: "Something went wrong" }),
        details: z.record(z.string(), z.any()).optional(),
    })
    .openapi({ title: "ErrorResponse" });
