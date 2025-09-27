//components/mobile/MobilePOS.tsx
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useProducts, useStores } from "@/lib/hooks/useData";
import { Product, CartItem, Store } from "@/lib/types";
import {
    Plus,
    Minus,
    ShoppingCart,
    X,
    Trash2,
    Store as Store1,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import Image from "next/image";
// import { Assignment } from "@/app/mobile/layout";
import { hasSellerRoleInStore } from "@/lib/utils/roleUtils";
import { Tables } from "@/lib/db.types";

export type Assignment = Tables<"user_store_assignments">;

export default function MobilePOS() {
    const { profile } = useAuth();
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const { data: storesData, isLoading: storesLoading } = useStores();
    const stores = storesData?.stores ?? [];
    const assignments = storesData?.assignments ?? {};

    // const sellerStores = stores.filter((store: Store) =>
    //     assignments[store.id]?.some(
    //         (assignment: Assignment) =>
    //             assignment.user_id === profile?.id &&
    //             assignment.role === "seller"
    //     )
    // );

    const sellerStores = stores.filter((store: Store) =>
        hasSellerRoleInStore(profile?.id ?? "", store.id, assignments)
    );

    const defaultStore = stores.find((store: Store) =>
        assignments[store.id]?.some(
            (assignment: Assignment) =>
                assignment.user_id === profile?.id && assignment.is_default
        )
    );
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCart, setShowCart] = useState(false);

    // Add state for showing/hiding others section
    const [showOthers, setShowOthers] = useState(false);

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

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const calculateTotal = () => {
        return cart.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
    };

    const getItemCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    const getProductQuantityInCart = (productId: string) => {
        const item = cart.find((item) => item.product.id === productId);
        return item ? item.quantity : 0;
    };

    // Add these state variables after existing useState declarations:
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    // Add toast function
    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000); // Auto-hide after 4 seconds
    };

    const processOrder = async () => {
        if (!selectedStore || cart.length === 0) {
            showToast("Please select a store and add items to cart", "error");
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
                }),
            });

            const data = await response.json();

            if (data.success) {
                showToast(
                    `Order processed! Total: ${formatRupiah(data.totalAmount)}`,
                    "success"
                );
                setCart([]);
                setShowCart(false);
            } else {
                showToast("Failed to process order: " + data.error, "error");
            }
        } catch (error) {
            showToast("Error processing order", "error");
            console.log(error);
        } finally {
            setProcessing(false);
        }
    };

    // Filter products
    const mainProducts = [...products]
        .filter((product) => product.is_main)
        .sort((a, b) => a.price - b.price);

    const otherProducts = [...products]
        .filter((product) => !product.is_main)
        .sort((a, b) => a.price - b.price);

    // Auto-select store if only one available
    useEffect(() => {
        if (defaultStore && !selectedStore) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, storesData]);

    // Prevent background scrolling when modal is open
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

    if (productsLoading || storesLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading POS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-24">
            {/* Store Selection - Always show if stores exist */}
            {sellerStores.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Store1 size={20} className="text-gray-600" />
                        <label className="block text-base font-semibold">
                            {sellerStores.length === 1
                                ? "Your Store"
                                : "Select Store"}
                        </label>
                    </div>
                    <select
                        disabled={sellerStores.length === 1}
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className={`w-full p-3 border rounded-lg focus:ring-2 ${
                            sellerStores.length === 1
                                ? "bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                                : "border-gray-300 focus:ring-blue-500"
                        }`}
                    >
                        {sellerStores.map((store: Store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Main Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {mainProducts.map((product: Product) => {
                    const quantityInCart = getProductQuantityInCart(product.id);

                    return (
                        <div
                            key={product.id}
                            className="bg-white rounded-xl shadow-sm overflow-hidden select-none relative cursor-pointer 
                       hover:shadow-md transition-all duration-200 
                       active:scale-90 active:bg-blue-50"
                            onClick={() => addToCart(product)}
                        >
                            {/* Cart Counter Badge */}
                            {quantityInCart > 0 && (
                                <div className="absolute top-2 right-2 z-0 bg-red-500 text-white rounded-lg w-6 h-6 text-sm flex items-center justify-center font-medium">
                                    {quantityInCart}
                                </div>
                            )}

                            <div className="p-3">
                                {/* Product Image and Info */}
                                {product.image_url && (
                                    <div className="flex gap-2 mb-3">
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={product.image_url}
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

                                {/* Add to Cart Button */}
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
                            className={`transform transition-transform duration-200 ${
                                showOthers ? "rotate-180" : ""
                            }`}
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
                            {otherProducts.map((product: Product) => {
                                const quantityInCart = getProductQuantityInCart(
                                    product.id
                                );

                                return (
                                    <div
                                        key={product.id}
                                        className="bg-white rounded-xl shadow-sm overflow-hidden select-none relative cursor-pointer 
                                   hover:shadow-md transition-all duration-200 
                                   active:scale-90 active:bg-blue-50 opacity-90"
                                        onClick={() => addToCart(product)}
                                    >
                                        {/* Cart Counter Badge */}
                                        {quantityInCart > 0 && (
                                            <div className="absolute top-2 right-2 z-0 bg-red-500 text-white rounded-lg w-6 h-6 text-sm flex items-center justify-center font-medium">
                                                {quantityInCart}
                                            </div>
                                        )}

                                        <div className="p-3">
                                            {/* Product Image and Info */}
                                            {product.image_url && (
                                                <div className="flex gap-2 mb-3">
                                                    <div className="flex-shrink-0">
                                                        <Image
                                                            src={
                                                                product.image_url
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
                                                                product.price
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Add to Cart Button */}
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

            {/* Sticky Bottom Cart Summary Bar */}
            {cart.length > 0 && (
                <div className="fixed bottom-16 left-0 right-0 bg-white border-y border-gray-400 p-4 z-40 ">
                    <div className="flex items-center justify-between max-w-md mx-auto">
                        <div className="flex-1">
                            <p className="text-sm text-gray-600">
                                {getItemCount()} items
                            </p>
                            <p className="text-lg font-bold text-gray-900">
                                {formatRupiah(calculateTotal())}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCart(true)}
                                className="px-3 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
                            >
                                View Cart
                            </button>
                            {/* <button
                                onClick={processOrder}
                                disabled={processing || !selectedStore}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? "Processing..." : "Confirm Now"}
                            </button> */}
                        </div>
                    </div>
                </div>
            )}
            {/* Cart Modal */}
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
                        {/* Fixed Header */}
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

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-4 pt-4">
                                <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                                    Current Order
                                    {cart.length > 0 && (
                                        <button
                                            onClick={() => setCart([])}
                                            className="text-red-500 hover:text-red-700 p-1 px-2 hover:bg-red-50 text-sm border border-red-200 rounded-full transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </h4>

                                {cart.length === 0 ? (
                                    <div className="text-center text-gray-500 my-30">
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
                                                                    .price
                                                            )}{" "}
                                                            / Pcs
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-lg font-bold text-gray-900">
                                                            {formatRupiah(
                                                                item.product
                                                                    .price *
                                                                    item.quantity
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.product.id
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
                                                                        1
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
                                                                        1
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

                        {/* Fixed Footer with Total and Actions */}
                        <div className="flex-shrink-0 bg-white p-4 pb-8 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xl font-bold text-gray-900">
                                    Total Transaction
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-gray-900">
                                        {formatRupiah(calculateTotal())}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={processOrder}
                                disabled={
                                    processing ||
                                    !selectedStore ||
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
            {/* Toast Notification */}
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
