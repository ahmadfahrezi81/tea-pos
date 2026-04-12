// lib/hooks/payments/useQrisPayment.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
    CreateQrisPaymentInput,
    CreateQrisPaymentResponse,
    QrisPaymentStatus,
} from "@/lib/schemas/payments";
import { mutate } from "swr";

// ============================================================================
// TYPES
// ============================================================================

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
    isStaging: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

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
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [xenditQrId, setXenditQrId] = useState<string | null>(null);

    const channelRef = useRef<RealtimeChannel | null>(null);
    const onSuccessRef = useRef(onSuccess);

    // keep onSuccess ref fresh without re-triggering effects
    useEffect(() => {
        onSuccessRef.current = onSuccess;
    }, [onSuccess]);

    const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

    // ── Cleanup ──────────────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (channelRef.current) {
            const supabase = createClient();
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    // ── Realtime subscription ────────────────────────────────────────────────
    const subscribeToPayment = useCallback(
        (pid: string, storeId: string) => {
            cleanup();

            const supabase = createClient();

            channelRef.current = supabase
                .channel(`payment-${pid}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "payments",
                        filter: `id=eq.${pid}`,
                    },
                    (payload) => {
                        const updated = payload.new as {
                            status: string;
                        };

                        if (updated.status === "succeeded") {
                            setStatus("succeeded");
                            mutate(
                                `orders-${storeId}-${new Date()
                                    .toISOString()
                                    .slice(0, 10)}`,
                            );
                            onSuccessRef.current();
                            cleanup();
                        } else if (
                            updated.status === "expired" ||
                            updated.status === "failed"
                        ) {
                            setStatus(updated.status as QrisPaymentStatus);
                            cleanup();
                        }
                    },
                )
                .subscribe();
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
        setPaymentId(null);
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
            setPaymentId(data.paymentId);
            setXenditQrId(data.xenditQrId);
            setStatus("pending");

            subscribeToPayment(data.paymentId, selectedStoreId);
        } catch (error) {
            console.error("Create QRIS payment error:", error);
            setStatus("failed");
        }
    }, [selectedStoreId, cart, subscribeToPayment, cleanup]);

    // ── Simulate payment (staging only) ─────────────────────────────────────
    const simulatePayment = useCallback(async () => {
        if (!xenditQrId || !amount) return;

        try {
            await fetch("/api/payments/qris/simulate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ xenditQrId, amount }),
            });
            // no need to handle response here
            // Realtime fires when webhook updates payment status
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
        isStaging,
    };
}
