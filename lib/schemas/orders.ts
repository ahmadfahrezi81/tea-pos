// lib/schemas/orders.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

// Input schemas for creating orders
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

// Query schemas
export const GetOrdersQuerySchema = z
    .object({
        storeId: UUIDSchema.optional().openapi({
            description: "Filter by store ID",
        }),
        page: z.coerce.number().int().min(1).default(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    })
    .openapi({ title: "GetOrdersQuery" });

// Response schemas
export const OrderItemWithProductSchema = z
    .object({
        id: UUIDSchema,
        quantity: z.number(),
        unit_price: z.number(),
        total_price: z.number(),
        products: z
            .object({
                name: z.string(),
            })
            .nullable(),
    })
    .openapi({ title: "OrderItemWithProduct" });

export const OrderWithDetailsSchema = z
    .object({
        id: UUIDSchema,
        store_id: UUIDSchema,
        user_id: UUIDSchema,
        total_amount: z.number(),
        created_at: z.string().nullable(),
        stores: z
            .object({
                name: z.string(),
            })
            .nullable(),
        profiles: z
            .object({
                full_name: z.string(),
            })
            .nullable(),
        order_items: z.array(OrderItemWithProductSchema),
    })
    .openapi({ title: "OrderWithDetails" });

export const OrdersResponseSchema = z
    .object({
        orders: z.array(OrderWithDetailsSchema),
    })
    .openapi({ title: "OrdersResponse" });

export const CreateOrderResponseSchema = z
    .object({
        success: z.boolean().openapi({ example: true }),
        orderId: UUIDSchema,
        totalAmount: z.number().openapi({ example: 31.98 }),
    })
    .openapi({ title: "CreateOrderResponse" });
