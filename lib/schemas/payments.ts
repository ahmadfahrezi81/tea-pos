// lib/schemas/payments.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 */

// ============================================================================
// ENUMS
// ============================================================================

export const PaymentStatusSchema = z
    .enum(["pending", "succeeded", "expired", "failed"])
    .openapi({
        description: "Status of the QRIS payment",
        example: "pending",
    });

export const PaymentMethodSchema = z.enum(["cash", "qris"]).openapi({
    description: "Payment method used for the order",
    example: "qris",
});

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateQrisPaymentInput = z
    .object({
        storeId: UUIDSchema,
        items: z
            .array(
                z.object({
                    productId: UUIDSchema,
                    quantity: z.number().int().min(1).max(1000),
                    unitPrice: z.number().min(0),
                }),
            )
            .min(1)
            .openapi({
                description: "Array of order items (minimum 1 item required)",
            }),
    })
    .openapi({ title: "CreateQrisPaymentInput" });

// ============================================================================
// XENDIT WEBHOOK PAYLOAD
// ============================================================================

export const XenditQrisWebhookPayload = z
    .object({
        id: z.string().openapi({
            description: "Xendit payment ID",
            example: "qrpy_fe0123b9-7543-455e-8bcf-c7970cb9352d",
        }),
        qr_id: z.string().openapi({
            description: "Xendit QR code ID",
            example: "qr_b949db25-f407-4955-97bf-497e57610951",
        }),
        reference_id: z.string().openapi({
            description: "Your reference ID",
            example: "tea-pos-pay-xxx",
        }),
        status: z.string().openapi({
            description: "Payment status from Xendit",
            example: "SUCCEEDED",
        }),
        amount: z.number().openapi({
            description: "Payment amount",
            example: 10000,
        }),
        currency: z.string().openapi({
            example: "IDR",
        }),
        payment_detail: z
            .object({
                receipt_id: z.string().nullable().optional(),
                source: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
    })
    .openapi({ title: "XenditQrisWebhookPayload" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const CreateQrisPaymentResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        paymentId: UUIDSchema,
        xenditQrId: z.string().openapi({
            description: "Xendit QR ID for simulate endpoint",
            example: "qr_b949db25-f407-4955-97bf-497e57610951",
        }),
        qrString: z.string().openapi({
            description: "Raw QRIS string to render as QR code",
            example: "00020101021226620014COM.GO-JEK...",
        }),
        amount: z.number().openapi({
            description: "Total amount for the payment",
            example: 10000,
        }),
        expiresAt: z.string().openapi({
            description: "ISO timestamp when QR expires",
            example: "2026-04-14T05:34:19.663641Z",
        }),
        referenceId: z.string().openapi({
            description: "Reference ID for tracking",
            example: "tea-pos-pay-xxx",
        }),
    })
    .openapi({ title: "CreateQrisPaymentResponse" });

export const SimulateQrisPaymentResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
    })
    .openapi({ title: "SimulateQrisPaymentResponse" });

export const PaymentResponse = z
    .object({
        id: UUIDSchema,
        xenditQrId: z.string(),
        xenditReferenceId: z.string(),
        qrString: z.string(),
        amount: z.number(),
        status: PaymentStatusSchema,
        storeId: UUIDSchema,
        tenantId: UUIDSchema.nullable(),
        userId: UUIDSchema,
        orderId: UUIDSchema.nullable(),
        pendingItems: z
            .array(
                z.object({
                    productId: UUIDSchema,
                    quantity: z.number().int().min(1),
                    unitPrice: z.number().min(0),
                }),
            )
            .nullable(),
        expiresAt: z.string().nullable(),
        createdAt: z.string().nullable(),
        updatedAt: z.string().nullable(),
    })
    .openapi({ title: "PaymentResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type CreateQrisPaymentInput = z.infer<typeof CreateQrisPaymentInput>;
export type XenditQrisWebhookPayload = z.infer<typeof XenditQrisWebhookPayload>;
export type CreateQrisPaymentResponse = z.infer<
    typeof CreateQrisPaymentResponse
>;
export type SimulateQrisPaymentResponse = z.infer<
    typeof SimulateQrisPaymentResponse
>;
export type PaymentResponse = z.infer<typeof PaymentResponse>;
export type QrisPaymentStatus =
    | z.infer<typeof PaymentStatusSchema>
    | "idle"
    | "loading";
