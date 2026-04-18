"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/client/supabase";
import type {
    CreateQrisPaymentInput,
    CreateQrisPaymentResponse,
    QrisPaymentStatus,
} from "@/lib/shared/schemas/payments";
import { mutate } from "swr";

interface UseQrisPaymentProps {
    selectedStoreId: string | null;
    cart: Array<{
        product: { id: string; price: number };
        quantity: number;
    }>;
    onSuccess: () => void;
}

interface UseQrisPaymentReturn {
    status: QrisPaymentStatus;
    qrString: string | null;
    amount: number | null;
    referenceId: string | null;
    expiresAt: string | null;
    createQrisPayment: () => Promise<void>;
    simulatePayment: () => Promise<void>;
}

export function useQrisPayment({
    selectedStoreId,
    cart,
    onSuccess,
}: UseQrisPaymentProps): UseQrisPaymentReturn {
    const [status, setStatus] = useState<QrisPaymentStatus>("idle");
    const [qrString, setQrString] = useState<string | null>(null);
    const [amount, setAmount] = useState<number | null>(null);
    const [referenceId, setReferenceId] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [xenditQrId, setXenditQrId] = useState<string | null>(null);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const onSuccessRef = useRef(onSuccess);

    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    // ── Cleanup ──────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    // ── Poll payment status ──────────────────────────────────────────────────
    const pollPaymentStatus = useCallback(
        (pid: string, storeId: string) => {
            cleanup();

            const supabase = createClient();

            intervalRef.current = setInterval(async () => {
                try {
                    const { data } = await supabase
                        .from("payments")
                        .select("status")
                        .eq("id", pid)
                        .single();

                    if (data?.status === "succeeded") {
                        cleanup();
                        setStatus("succeeded");
                        mutate(
                            `orders-${storeId}-${new Date()
                                .toISOString()
                                .slice(0, 10)}`,
                        );
                        onSuccessRef.current();
                    } else if (
                        data?.status === "expired" ||
                        data?.status === "failed"
                    ) {
                        cleanup();
                        setStatus(data.status as QrisPaymentStatus);
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 2000);
        },
        [cleanup],
    );

    // ── Create QRIS payment ──────────────────────────────────────────────────
    const createQrisPayment = useCallback(async () => {
        if (!selectedStoreId || cart.length === 0) return;

        setStatus("loading");
        setQrString(null);
        setAmount(null);
        setReferenceId(null);
        setExpiresAt(null);
        setXenditQrId(null);
        cleanup();

        try {
            const payload: CreateQrisPaymentInput = {
                storeId: selectedStoreId,
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                })),
            };

            const response = await fetch("/api/payments/qris", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data: CreateQrisPaymentResponse = await response.json();

            if (!response.ok || !data.success) {
                setStatus("failed");
                return;
            }

            setQrString(data.qrString);
            setAmount(data.amount);
            setReferenceId(data.referenceId);
            setExpiresAt(data.expiresAt);
            setXenditQrId(data.xenditQrId);
            setStatus("pending");

            pollPaymentStatus(data.paymentId, selectedStoreId);
        } catch (error) {
            console.error("Create QRIS payment error:", error);
            setStatus("failed");
        }
    }, [selectedStoreId, cart, pollPaymentStatus, cleanup]);

    // ── Simulate payment (staging only) ─────────────────────────────────────
    const simulatePayment = useCallback(async () => {
        if (!xenditQrId || !amount) return;

        try {
            await fetch("/api/payments/qris/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ xenditQrId, amount }),
            });
        } catch (error) {
            console.error("Simulate error:", error);
        }
    }, [xenditQrId, amount]);

    return {
        status,
        qrString,
        amount,
        referenceId,
        expiresAt,
        createQrisPayment,
        simulatePayment,
    };
}
