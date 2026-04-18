// lib/openapi/payments.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateQrisPaymentInput,
    CreateQrisPaymentResponse,
    SimulateQrisPaymentResponse,
    XenditQrisWebhookPayload,
} from "../schemas/payments";
import { ErrorResponseSchema } from "../schemas/index";

export function registerPaymentRoutes(registry: OpenAPIRegistry) {
    // POST /api/payments/qris
    registry.registerPath({
        method: "post",
        path: "/api/payments/qris",
        description: "Create a QRIS payment and get a QR string to display",
        summary: "Create QRIS payment",
        tags: ["Payments"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateQrisPaymentInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created — returns QR string and payment details",
                content: {
                    "application/json": {
                        schema: CreateQrisPaymentResponse,
                    },
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
            403: {
                description: "Forbidden — seller role required",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // POST /api/payments/qris/webhook
    registry.registerPath({
        method: "post",
        path: "/api/payments/qris/webhook",
        description:
            "Xendit webhook — called when a QRIS payment is paid or refunded. Verifies token, updates payment status, creates order.",
        summary: "Xendit QRIS webhook handler",
        tags: ["Payments"],
        request: {
            body: {
                content: {
                    "application/json": { schema: XenditQrisWebhookPayload },
                },
            },
        },
        responses: {
            200: {
                description: "Webhook received and processed",
                content: {
                    "application/json": {
                        schema: SimulateQrisPaymentResponse,
                    },
                },
            },
            400: {
                description: "Bad Request — invalid payload",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            401: {
                description: "Unauthorized — invalid webhook token",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // POST /api/payments/qris/simulate
    registry.registerPath({
        method: "post",
        path: "/api/payments/qris/simulate",
        description:
            "Staging only — simulate a QRIS payment completion via Xendit sandbox",
        summary: "Simulate QRIS payment (staging only)",
        tags: ["Payments"],
        request: {
            body: {
                content: {
                    "application/json": {
                        schema: CreateQrisPaymentInput.pick({
                            storeId: true,
                        }).extend({
                            xenditQrId: CreateQrisPaymentInput.shape.storeId,
                            amount: CreateQrisPaymentInput.shape.storeId,
                        }),
                    },
                },
            },
        },
        responses: {
            200: {
                description: "Payment simulated successfully",
                content: {
                    "application/json": {
                        schema: SimulateQrisPaymentResponse,
                    },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            403: {
                description: "Forbidden — staging only",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
