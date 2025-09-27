// import POSSystem from "./components/POSSystem";

// export default function POSPage() {
//     return (
//         <div className="py-4">
//             <h1 className="text-3xl font-bold mb-8">Point of Sale</h1>
//             <POSSystem />
//         </div>
//     );
// }

// components/pos/POSPageComponent.tsx
"use client";
import React, { useState } from "react";
import { useProducts, useStores } from "@/lib/hooks/useData";
import { useCart } from "./hooks/useCart";
import { useOrderActions } from "./hooks/useOrderActions";
import { ProductGrid } from "./components/ProductGrid";
import { CartSidebar } from "./components/CartSidebar";
import { ShoppingCart } from "lucide-react";

export default function POSPageComponent() {
    const { data: products, isLoading: productsLoading } = useProducts();
    const { data: storesData, isLoading: storesLoading } = useStores();
    const stores = storesData?.stores ?? [];

    const [selectedStore, setSelectedStore] = useState<string>("");

    // Custom hooks
    const cart = useCart();
    const orderActions = useOrderActions();

    const handleProcessOrder = () => {
        orderActions.processOrder(selectedStore, cart.cart, () => {
            cart.clearCart();
        });
    };

    if (productsLoading || storesLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 text-sm">
                        Loading POS system...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-30 py-6 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Point of Sale</h1>
                        <p className="text-gray-600">
                            Select products and process orders
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                        <ShoppingCart size={20} />
                        <span className="text-sm font-medium">
                            {cart.cart.length} items in cart
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <ProductGrid
                        products={products || []}
                        onAddToCart={cart.addToCart}
                    />

                    <CartSidebar
                        cart={cart.cart}
                        stores={stores}
                        selectedStore={selectedStore}
                        processing={orderActions.processing}
                        onStoreSelect={setSelectedStore}
                        onUpdateQuantity={cart.updateQuantity}
                        onProcessOrder={handleProcessOrder}
                        calculateTotal={cart.calculateTotal}
                    />
                </div>
            </div>

            {/* Empty State */}
            {(!products || products.length === 0) && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No products available</p>
                    <p className="text-sm text-gray-400">
                        Please add products in the Products Management section
                        first
                    </p>
                </div>
            )}
        </div>
    );
}
