// lib/schemas/orders.ts
import { z } from "zod";
import { UUIDSchema } from "./common";
import { PaymentMethodSchema } from "./payments";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateOrderInput, UpdateOrderInput
 *   - Use camelCase for fields (API layer)
 *
 * Query Schemas (for GET request parameters):
 *   - Format: {Action}{Entity}Query or List{Entity}Query
 *   - Example: ListOrdersQuery, GetOrderQuery
 *   - Use camelCase for fields (API layer)
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: OrderResponse, CreateOrderResponse, OrderListResponse
 *   - Use camelCase for fields (API layer)
 *
 * Note: Use transformKeys() helper to convert DB snake_case to API camelCase
 */

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateOrderItemInput = z
    .object({
        productId: UUIDSchema,
        quantity: z.number().int().min(1).max(1000).openapi({
            description: "Quantity of items",
            example: 2,
        }),
        unitPrice: z.number().min(0).openapi({
            description: "Price per unit in currency units",
            example: 15.99,
        }),
    })
    .openapi({ title: "CreateOrderItemInput" });

export const CreateOrderInput = z
    .object({
        storeId: UUIDSchema,
        items: z.array(CreateOrderItemInput).min(1).openapi({
            description: "Array of order items (minimum 1 item required)",
        }),
        // tenantId is NOT included in input - it's derived from the store
    })
    .openapi({ title: "CreateOrderInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListOrdersQuery = z
    .object({
        storeId: UUIDSchema.optional().openapi({
            description: "Filter orders by store ID",
        }),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .optional()
            .openapi({
                description: "Filter orders by date (YYYY-MM-DD format)",
                example: "2025-10-01",
            }),
        // tenantId is NOT a query param - it's from the session
    })
    .openapi({ title: "ListOrdersQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const OrderItemResponse = z
    .object({
        id: UUIDSchema,
        orderId: UUIDSchema.nullable(),
        productId: UUIDSchema.nullable(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
        createdAt: z.string().nullable(),
        tenantId: UUIDSchema.nullable(), // ← Added for response
        products: z
            .object({
                name: z.string(),
            })
            .nullable(),
    })
    .openapi({ title: "OrderItemResponse" });

export const OrderResponse = z
    .object({
        id: UUIDSchema,
        storeId: UUIDSchema,
        userId: UUIDSchema,
        totalAmount: z.number(),
        createdAt: z.string().nullable(),
        tenantId: UUIDSchema.nullable(), // ← Added for response
        stores: z
            .object({
                name: z.string(),
            })
            .nullable(),
        profiles: z
            .object({
                fullName: z.string(),
            })
            .nullable(),
        orderItems: z.array(OrderItemResponse),
        paymentMethod: PaymentMethodSchema.optional().openapi({
            description: "Payment method used",
            example: "cash",
        }),
    })
    .openapi({ title: "OrderResponse" });

export const OrderListResponse = z
    .object({
        orders: z.array(OrderResponse),
    })
    .openapi({ title: "OrderListResponse" });

export const CreateOrderResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        orderId: UUIDSchema,
        totalAmount: z.number().openapi({
            description: "Total amount for the order",
            example: 31.98,
        }),
        // tenantId not needed in create response - client doesn't care
    })
    .openapi({ title: "CreateOrderResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateOrderItemInput = z.infer<typeof CreateOrderItemInput>;
export type CreateOrderInput = z.infer<typeof CreateOrderInput>;
export type ListOrdersQuery = z.infer<typeof ListOrdersQuery>;
export type OrderItemResponse = z.infer<typeof OrderItemResponse>;
export type OrderResponse = z.infer<typeof OrderResponse>;
export type OrderListResponse = z.infer<typeof OrderListResponse>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponse>;

export type Order = z.infer<typeof OrderResponse>;
