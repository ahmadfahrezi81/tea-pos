"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { useCreateOrder } from "./useCreateOrder";
import { useToast } from "@/lib/context/ToastContext";
import type { ProductResponse } from "@tea-pos/features/products/schema";

export interface CartItem {
    product: ProductResponse;
    quantity: number;
}

export function useCart(selectedStoreId: string | null) {
    const { createOrder, isProcessing } = useCreateOrder();
    const { showToast } = useToast();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);

    const addToCart = useCallback((product: ProductResponse) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    }, []);

    const updateQuantity = useCallback((productId: string, quantity: number) => {
        setCart((prev) =>
            quantity <= 0
                ? prev.filter((item) => item.product.id !== productId)
                : prev.map((item) =>
                      item.product.id === productId ? { ...item, quantity } : item,
                  ),
        );
    }, []);

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);
    const openCart = useCallback(() => setShowCart(true), []);
    const closeCart = useCallback(() => setShowCart(false), []);

    const total = useMemo(
        () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        [cart],
    );

    const itemCount = useMemo(
        () => cart.reduce((count, item) => count + item.quantity, 0),
        [cart],
    );

    const cartQuantityMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const item of cart) map[item.product.id] = item.quantity;
        return map;
    }, [cart]);

    const processOrder = useCallback(async () => {
        if (!selectedStoreId || cart.length === 0) {
            showToast("No store selected or cart is empty", "error");
            return;
        }

        const data = await createOrder(
            {
                storeId: selectedStoreId,
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                    unitPrice: item.product.price,
                })),
            },
            (result) => {
                showToast(
                    "Order confirmed!",
                    "success",
                    `${itemCount} items · ${formatRupiah(result.totalAmount)}`,
                );
                setCart([]);
                closeCart();
            },
        );

        if (!data) {
            showToast("Error processing order", "error");
        } else if (!data.success) {
            showToast("Failed to process order", "error");
        }
    }, [selectedStoreId, cart, showToast, closeCart, itemCount, createOrder]);

    useEffect(() => {
        document.body.style.overflow = showCart ? "hidden" : "unset";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [showCart]);

    return {
        cart,
        showCart,
        total,
        itemCount,
        cartQuantityMap,
        isProcessing,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        openCart,
        closeCart,
        processOrder,
    };
}
