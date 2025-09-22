// hooks/useOrderActions.ts
import { useState } from "react";
import { OrderRequest, CartItem } from "../types/pos";

export const useOrderActions = () => {
    const [processing, setProcessing] = useState(false);

    const processOrder = async (
        selectedStore: string,
        cart: CartItem[],
        onSuccess: () => void
    ) => {
        if (!selectedStore || cart.length === 0) {
            alert("Please select a store and add items to cart");
            return;
        }

        setProcessing(true);

        const items = cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price,
        }));

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    storeId: selectedStore,
                    items,
                } as OrderRequest),
            });

            const data = await response.json();

            if (data.success) {
                alert(`Order processed! Total: Rp ${data.totalAmount}`);
                onSuccess();
            } else {
                alert("Failed to process order: " + data.error);
            }
        } catch (error) {
            alert("Error processing order");
            console.log(error);
        } finally {
            setProcessing(false);
        }
    };

    return {
        processing,
        processOrder,
    };
};
