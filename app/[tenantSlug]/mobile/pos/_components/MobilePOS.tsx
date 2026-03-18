"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Minus, ShoppingCart, X, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import { CreateOrderInput, CreateOrderResponse } from "@/lib/schemas/orders";
import { mutate } from "swr";
import { useProducts } from "@/lib/hooks/products/useProducts";
import { useStore } from "@/lib/context/StoreContext";
import type { ProductResponse } from "@/lib/schemas/products";
import type { Product } from "@/lib/schemas/products";
import { format } from "date-fns";

export interface CartItem {
    product: ProductResponse;
    quantity: number;
}

export default function MobilePOS() {
    const { selectedStoreId } = useStore();
    const { data: products = [], isLoading: productsLoading } = useProducts();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showOthers, setShowOthers] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const addToCart = (product: Product) => {
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
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) =>
                prev.filter((item) => item.product.id !== productId),
            );
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.product.id === productId
                        ? { ...item, quantity }
                        : item,
                ),
            );
        }
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const calculateTotal = () =>
        cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const getItemCount = () =>
        cart.reduce((count, item) => count + item.quantity, 0);

    const getProductQuantityInCart = (productId: string) =>
        cart.find((item) => item.product.id === productId)?.quantity ?? 0;

    const processOrder = async () => {
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
                setShowCart(false);
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
    };

    const mainProducts = [...products]
        .filter((p) => p.isMain)
        .sort((a, b) => a.price - b.price);

    const otherProducts = [...products]
        .filter((p) => !p.isMain)
        .sort((a, b) => a.price - b.price);

    useEffect(() => {
        if (showCart) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [showCart]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    if (productsLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">Loading POS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-24">
            <div>
                <p className="text-xl font-bold text-gray-900">
                    {getGreeting()}
                </p>
                <p className="text-base font-medium text-gray-600">
                    {format(new Date(), "EE, dd MMMM")}
                </p>
            </div>
            {/* Main Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {mainProducts.map((product) => {
                    const quantityInCart = getProductQuantityInCart(product.id);
                    return (
                        <div
                            key={product.id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden select-none relative cursor-pointer hover:shadow-md transition-all duration-200 active:scale-90 active:bg-blue-50"
                            onClick={() => addToCart(product)}
                        >
                            {quantityInCart > 0 && (
                                <div className="absolute top-2 right-2 z-0 bg-red-500 text-white rounded-lg w-6 h-6 text-sm flex items-center justify-center font-medium">
                                    {quantityInCart}
                                </div>
                            )}
                            <div className="p-3">
                                {product.imageUrl && (
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-shrink-0">
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
                                <div className="text-center text-blue-500 text-xs font-medium py-1.5 rounded-lg border-blue-500 border-1">
                                    Tap to add
                                </div>
                            </div>
                        </div>
                    );
                })}
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
                            {otherProducts.map((product) => {
                                const quantityInCart = getProductQuantityInCart(
                                    product.id,
                                );
                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white rounded-xl shadow-sm overflow-hidden select-none relative cursor-pointer hover:shadow-md transition-all duration-200 active:scale-90 active:bg-blue-50 opacity-90"
                                        onClick={() => addToCart(product)}
                                    >
                                        {quantityInCart > 0 && (
                                            <div className="absolute top-2 right-2 z-0 bg-red-500 text-white rounded-lg w-6 h-6 text-sm flex items-center justify-center font-medium">
                                                {quantityInCart}
                                            </div>
                                        )}
                                        <div className="p-3">
                                            {product.imageUrl && (
                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-shrink-0">
                                                        <Image
                                                            src={
                                                                product.imageUrl
                                                            }
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
                                                            {formatRupiah(
                                                                product.price,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="text-center text-blue-500 text-xs font-medium py-1.5 rounded-lg border-blue-500 border-1">
                                                Tap to add
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Sticky Bottom Cart Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-y border-gray-400 p-4 z-40">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">
                                {getItemCount()} items
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                                {formatRupiah(calculateTotal())}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCart(true)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                        >
                            View Cart
                        </button>
                    </div>
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCart(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-2xl sticky top-0 z-10">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold">Cart</h3>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 pt-4">
                                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                                    Current Order
                                    {cart.length > 0 && (
                                        <button
                                            onClick={() => setCart([])}
                                            className="text-red-500 p-1 px-2 hover:bg-red-50 text-sm border border-red-200 rounded-full transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </h4>

                                {cart.length === 0 ? (
                                    <div className="text-center text-gray-500 my-20">
                                        <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>No items in cart</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pb-4">
                                        {cart.map((item) => (
                                            <div
                                                key={item.product.id}
                                                className="border-b border-gray-100 pb-4 last:border-b-0"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex-1">
                                                        <h5 className="font-medium text-lg text-gray-900">
                                                            {item.product.name}
                                                        </h5>
                                                        <p className="text-sm text-gray-600">
                                                            {item.quantity} x{" "}
                                                            {formatRupiah(
                                                                item.product
                                                                    .price,
                                                            )}{" "}
                                                            / Pcs
                                                        </p>
                                                    </div>
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {formatRupiah(
                                                            item.product.price *
                                                                item.quantity,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.product.id,
                                                            )
                                                        }
                                                        className="w-8 h-8 text-red-500 rounded-full flex items-center justify-center border border-red-200 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.product
                                                                        .id,
                                                                    item.quantity -
                                                                        1,
                                                                )
                                                            }
                                                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                                                        >
                                                            <Minus size={18} />
                                                        </button>
                                                        <span className="font-semibold text-lg w-8 text-center">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.product
                                                                        .id,
                                                                    item.quantity +
                                                                        1,
                                                                )
                                                            }
                                                            className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors"
                                                        >
                                                            <Plus size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-shrink-0 bg-white p-4 pb-8 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xl font-bold text-gray-900">
                                    Total Transaction
                                </span>
                                <span className="text-xl font-bold text-gray-900">
                                    {formatRupiah(calculateTotal())}
                                </span>
                            </div>
                            <button
                                onClick={processOrder}
                                disabled={
                                    processing ||
                                    !selectedStoreId ||
                                    cart.length === 0
                                }
                                className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {processing ? "Processing..." : "Confirm Order"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg text-sm ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
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
