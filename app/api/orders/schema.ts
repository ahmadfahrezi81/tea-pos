// app/api/orders/schema.ts
import { z } from "zod";

export const CreateOrderSchema = z.object({
    storeId: z.string().uuid(),
    items: z
        .array(
            z.object({
                productId: z.string().uuid(),
                quantity: z.number().int().positive(),
                unitPrice: z.number().positive(),
            })
        )
        .min(1),
});

export const CreateOrderResponseSchema = z.object({
    success: z.boolean(),
    orderId: z.string().uuid(),
    totalAmount: z.number(),
});

export const GetOrdersResponseSchema = z.object({
    orders: z.array(z.any()), // You can refine this with Supabase types later
});

// For type inference in your handlers
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateOrderResponse = z.infer<typeof CreateOrderResponseSchema>;
export type GetOrdersResponse = z.infer<typeof GetOrdersResponseSchema>;
