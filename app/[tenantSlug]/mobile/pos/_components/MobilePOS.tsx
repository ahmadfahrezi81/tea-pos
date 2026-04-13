"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { CreateOrderInput, CreateOrderResponse } from "@/lib/schemas/orders";
import { mutate } from "swr";
import { useProducts } from "@/lib/hooks/products/useProducts";
import { useStore } from "@/lib/context/StoreContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import type { ProductResponse } from "@/lib/schemas/products";
import type { Product } from "@/lib/schemas/products";
import { format } from "date-fns";
import { WeatherDrawer } from "./WeatherDrawer";
import { WeatherButton } from "./WeatherButton";
import { CartDrawer } from "./CartDrawer";
import { useIsIPhonePWA } from "@/lib/frontend/hooks/usePWA";

export interface CartItem {
    product: ProductResponse;
    quantity: number;
}

// ─── Product Card ─────────────────────────────────────────────────────────────
// Memoised so only the tapped card re-renders when its quantity changes,
// not the entire grid. translateZ(0) moves the press animation to the GPU —
// avoids the layout-recalc that causes jank on mid-range Android devices.

interface ProductCardProps {
    product: ProductResponse;
    quantityInCart: number;
    onAdd: (product: Product) => void;
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

    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showOthers, setShowOthers] = useState(false);
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const showToast = useCallback(
        (message: string, type: "success" | "error") => {
            setToast({ message, type });
            setTimeout(() => setToast(null), 4000);
        },
        [],
    );

    const addToCart = useCallback((product: Product) => {
        setCart((prev) => {
            const existing = prev.find(
                (item) => item.product.id === product.id,
            );
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

    const updateQuantity = useCallback(
        (productId: string, quantity: number) => {
            setCart((prev) =>
                quantity <= 0
                    ? prev.filter((item) => item.product.id !== productId)
                    : prev.map((item) =>
                          item.product.id === productId
                              ? { ...item, quantity }
                              : item,
                      ),
            );
        },
        [],
    );

    const removeFromCart = useCallback((productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    }, []);

    const clearCart = useCallback(() => setCart([]), []);
    const closeCart = useCallback(() => setShowCart(false), []);
    const openCart = useCallback(() => setShowCart(true), []);

    const total = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + item.product.price * item.quantity,
                0,
            ),
        [cart],
    );

    const itemCount = useMemo(
        () => cart.reduce((count, item) => count + item.quantity, 0),
        [cart],
    );

    // Keyed map so ProductCard can look up its quantity in O(1)
    const cartQuantityMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const item of cart) {
            map[item.product.id] = item.quantity;
        }
        return map;
    }, [cart]);

    const processOrder = useCallback(async () => {
        if (!selectedStoreId || cart.length === 0) {
            showToast("No store selected or cart is empty", "error");
            return;
        }

        setProcessing(true);

        const payload: CreateOrderInput = {
            storeId: selectedStoreId,
            items: cart.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitPrice: item.product.price,
            })),
        };

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data: CreateOrderResponse = await response.json();

            if (data.success) {
                showToast(
                    `Order processed! Total: ${formatRupiah(data.totalAmount)}`,
                    "success",
                );
                setCart([]);
                closeCart();
                mutate(
                    `orders-${selectedStoreId}-${new Date().toISOString().slice(0, 10)}`,
                );
            } else {
                showToast("Failed to process order", "error");
            }
        } catch (error) {
            showToast("Error processing order", "error");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    }, [selectedStoreId, cart, showToast, closeCart]);

    const mainProducts = useMemo(
        () =>
            [...products]
                .filter((p) => p.isMain)
                .sort((a, b) => a.price - b.price),
        [products],
    );

    const otherProducts = useMemo(
        () =>
            [...products]
                .filter((p) => !p.isMain)
                .sort((a, b) => a.price - b.price),
        [products],
    );

    useEffect(() => {
        document.body.style.overflow = showCart ? "hidden" : "unset";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [showCart]);

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
                    <p className="text-xl font-bold text-gray-900">
                        {greeting}
                    </p>
                    <p className="text-base font-medium text-gray-600">
                        {format(new Date(), "EE, dd MMMM")}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <WeatherButton onClick={() => setIsWeatherOpen(true)} />
                </div>
            </div>
            {/* Main Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {mainProducts.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        quantityInCart={cartQuantityMap[product.id] ?? 0}
                        onAdd={addToCart}
                    />
                ))}
            </div>
            {/* Others Section */}
            {otherProducts.length > 0 && (
                <div className="mt-6">
                    <button
                        onClick={() => setShowOthers(!showOthers)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                        <span className="font-medium text-gray-700">
                            Others ({otherProducts.length} items)
                        </span>
                        <div
                            className={`transform transition-transform duration-200 ${showOthers ? "rotate-180" : ""}`}
                        >
                            <svg
                                className="w-5 h-5 text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                />
                            </svg>
                        </div>
                    </button>

                    {showOthers && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                            {otherProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    quantityInCart={
                                        cartQuantityMap[product.id] ?? 0
                                    }
                                    onAdd={addToCart}
                                    dimmed
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
            {/* Sticky Bottom Bar */}
            {cart.length > 0 && (
                <div
                    className={`fixed ${isIPhonePWA ? "bottom-[98px]" : "bottom-[66px]"} left-0 right-0 bg-white border-y border-gray-400 p-4 z-40`}
                >
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">
                                {itemCount} items
                            </p>
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
                                        <span className="font-bold text-white">
                                            Clear All
                                        </span>
                                    </button>
                                    <button
                                        onClick={processOrder}
                                        disabled={processing}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {processing
                                            ? "Processing..."
                                            : "Confirm Order"}
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
                    processing={processing}
                    selectedStoreId={selectedStoreId}
                    onShowToast={showToast}
                />
            )}
            {/* Weather Drawer */}
            <WeatherDrawer
                isOpen={isWeatherOpen}
                onClose={() => setIsWeatherOpen(false)}
            />
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg text-sm ${
                        toast.type === "success"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                    }`}
                >
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-4 text-white hover:opacity-75"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
