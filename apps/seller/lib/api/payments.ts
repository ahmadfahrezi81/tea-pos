import { apiFetch } from "./client";
import type { CreateQrisPaymentInput, PaymentStatus } from "@tea-pos/features/payments/schema";
import { CreateQrisPaymentResponse } from "@tea-pos/features/payments/schema";

export const paymentsApi = {
    createQris: async (input: CreateQrisPaymentInput) => {
        return CreateQrisPaymentResponse.parse(await apiFetch<unknown>("/api/payments/qris", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
    getQrisStatus: async (paymentId: string): Promise<{ status: PaymentStatus }> => {
        return apiFetch<{ status: PaymentStatus }>(
            `/api/payments/qris?paymentId=${encodeURIComponent(paymentId)}`
        );
    },
    simulateQris: async (xenditQrId: string, amount: number) => {
        return apiFetch<unknown>("/api/payments/qris/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ xenditQrId, amount }),
        });
    },
};
