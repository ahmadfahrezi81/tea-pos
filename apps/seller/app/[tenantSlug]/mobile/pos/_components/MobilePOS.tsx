"use client";

import { useMemo, memo } from "react";
import Image from "next/image";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { useProducts } from "@/lib/hooks/products/useProducts";
import { useCart } from "@/lib/hooks/orders/useCart";
import { useStore } from "@/lib/context/StoreContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import type { ProductResponse } from "@tea-pos/features/products/schema";
import { format } from "date-fns";
import { WeatherDrawer } from "./WeatherDrawer";
import { WeatherButton } from "./WeatherButton";
import { CartDrawer } from "./CartDrawer";
import { useIsIPhonePWA } from "@/lib/usePWA";
import { useState } from "react";

// ─── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
    product: ProductResponse;
    quantityInCart: number;
    onAdd: (product: ProductResponse) => void;
    dimmed?: boolean;
}

const ProductCard = memo(function ProductCard({
    product,
    quantityInCart,
    onAdd,
    dimmed = false,
}: ProductCardProps) {
    return (
        <div
            className={`bg-white rounded-xl shadow-sm overflow-hidden select-none relative cursor-pointer hover:shadow-md ${dimmed ? "opacity-90" : ""}`}
            style={{
                transform: "translateZ(0)",
                transition: "transform 150ms ease, box-shadow 200ms ease",
                WebkitTapHighlightColor: "transparent",
                willChange: "transform",
            }}
            onPointerDown={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                    "translateZ(0) scale(0.93)";
            }}
            onPointerUp={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                    "translateZ(0) scale(1)";
            }}
            onPointerLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform =
                    "translateZ(0) scale(1)";
            }}
            onClick={() => {
                requestAnimationFrame(() => onAdd(product));
            }}
        >
            {quantityInCart > 0 && (
                <div className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-lg w-6 h-6 text-sm flex items-center justify-center font-medium">
                    {quantityInCart}
                </div>
            )}
            <div className="p-3">
                {product.imageUrl && (
                    <div className="flex gap-2 mb-3">
                        <div className="shrink-0">
                            <Image
                                src={product.imageUrl}
                                alt={product.name}
                                width={50}
                                height={50}
                                className="rounded object-cover"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-800 text-base leading-tight mt-1">
                                {product.name}
                            </h3>
                            <p className="text-base font-semibold text-green-600">
                                {formatRupiah(product.price)}
                            </p>
                        </div>
                    </div>
                )}
                <div className="text-center text-brand text-xs font-medium py-1.5 rounded-lg border-brand border">
                    Tap to add
                </div>
            </div>
        </div>
    );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobilePOS() {
    const { selectedStoreId } = useStore();
    const { fastOrderMode } = useFastOrderMode();
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const isIPhonePWA = useIsIPhonePWA();
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);

    const {
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
    } = useCart(selectedStoreId);

    const sortedProducts = useMemo(
        () => [...products].sort((a, b) => {
            if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
            return a.price - b.price;
        }),
        [products],
    );

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    }, []);

    if (productsLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">Loading POS...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 pb-24">
            {/* Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xl font-bold text-gray-900">{greeting}</p>
                    <p className="text-base font-medium text-gray-600">
                        {format(new Date(), "EE, dd MMMM")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <WeatherButton onClick={() => setIsWeatherOpen(true)} />
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {sortedProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        quantityInCart={cartQuantityMap[product.id] ?? 0}
                        onAdd={addToCart}
                    />
                ))}
            </div>

            {/* Sticky Bottom Bar */}
            {cart.length > 0 && (
                <div
                    className={`fixed ${isIPhonePWA ? "bottom-[98px]" : "bottom-[66px]"} left-0 right-0 bg-white border-y border-gray-400 p-4 z-40`}
                >
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">{itemCount} items</p>
                            <p className="text-lg font-bold text-gray-900">
                                {formatRupiah(total)}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {fastOrderMode ? (
                                <>
                                    <button
                                        onClick={clearCart}
                                        className="flex items-center gap-1 bg-red-500 px-4 py-2 rounded-lg font-medium"
                                    >
                                        <span className="font-bold text-white">Clear All</span>
                                    </button>
                                    <button
                                        onClick={processOrder}
                                        disabled={isProcessing}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {isProcessing ? "Processing..." : "Confirm Order"}
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={openCart}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                                >
                                    View Cart
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer — only in normal mode */}
            {!fastOrderMode && (
                <CartDrawer
                    isOpen={showCart}
                    onClose={closeCart}
                    cart={cart}
                    onClearCart={clearCart}
                    onUpdateQuantity={updateQuantity}
                    onRemoveFromCart={removeFromCart}
                    onProcessOrder={processOrder}
                    processing={isProcessing}
                    selectedStoreId={selectedStoreId}
                />
            )}

            {/* Weather Drawer */}
            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
        </div>
    );
}
