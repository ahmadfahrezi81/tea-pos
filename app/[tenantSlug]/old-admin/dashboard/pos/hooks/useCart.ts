// hooks/useCart.ts
import { useState } from "react";
import { CartItem, Product } from "../types/pos";

export const useCart = () => {
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find(
                (item) => item.product.id === product.id
            );
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) =>
                prev.filter((item) => item.product.id !== productId)
            );
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.product.id === productId ? { ...item, quantity } : item
                )
            );
        }
    };

    const clearCart = () => {
        setCart([]);
    };

    const calculateTotal = () => {
        return cart.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
    };

    return {
        cart,
        addToCart,
        updateQuantity,
        clearCart,
        calculateTotal,
    };
};
