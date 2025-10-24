// lib/schemas/order-list.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * SCHEMAS FOR ORDER LIST PAGE
 * Separate from orders.ts to avoid conflicts with existing order creation flow
 */

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListAllOrdersQuery = z
    .object({
        storeIds: z
            .string()
            .optional()
            .transform((val) => {
                if (!val) return undefined;
                return val.split(",").filter(Boolean);
            })
            .pipe(z.array(UUIDSchema).optional())
            .openapi({
                description: "Comma-separated store IDs to filter orders",
                example: "uuid1,uuid2,uuid3",
            }),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
            .openapi({
                description: "Filter orders by date (YYYY-MM-DD format)",
                example: "2025-10-14",
            }),
        productIds: z
            .string()
            .optional()
            .transform((val) => {
                if (!val) return undefined;
                return val.split(",").filter(Boolean);
            })
            .pipe(z.array(UUIDSchema).optional())
            .openapi({
                description:
                    "Comma-separated product IDs to filter orders containing these products",
                example: "uuid1,uuid2",
            }),
    })
    .openapi({ title: "ListAllOrdersQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const OrderListItemResponse = z
    .object({
        id: UUIDSchema,
        storeId: UUIDSchema,
        userId: UUIDSchema,
        totalAmount: z.number(),
        createdAt: z.string(),
        tenantId: UUIDSchema.nullable(),
        // Seller info
        seller: z
            .object({
                fullName: z.string(),
            })
            .nullable(),
        // Store info
        store: z
            .object({
                name: z.string(),
            })
            .nullable(),
        // Order items with product details
        items: z.array(
            z.object({
                id: UUIDSchema,
                productId: UUIDSchema.nullable(),
                quantity: z.number(),
                unitPrice: z.number(),
                totalPrice: z.number(),
                product: z
                    .object({
                        name: z.string(),
                    })
                    .nullable(),
            })
        ),
        // Computed fields
        totalQuantity: z.number(),
    })
    .openapi({ title: "OrderListItemResponse" });

export const AllOrdersListResponse = z
    .object({
        orders: z.array(OrderListItemResponse),
    })
    .openapi({ title: "AllOrdersListResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ListAllOrdersQuery = z.infer<typeof ListAllOrdersQuery>;
export type OrderListItemResponse = z.infer<typeof OrderListItemResponse>;
export type AllOrdersListResponse = z.infer<typeof AllOrdersListResponse>;
export type OrderListItem = z.infer<typeof OrderListItemResponse>;
