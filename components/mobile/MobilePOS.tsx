//components/mobile/MobilePOS.tsx
"use client";
import { useState, useEffect } from "react";
import { useProducts, useStores } from "@/lib/hooks/useData";
import { Profile, Product, CartItem, Store } from "@/lib/types";
import { Plus, Minus, ShoppingCart, X } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import Image from "next/image";

interface MobilePOSProps {
    profile: Profile | null;
}

export default function MobilePOS({ profile }: MobilePOSProps) {
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const { data: stores = [], isLoading: storesLoading } = useStores(
        profile?.role ?? "",
        profile?.id ?? ""
    );

    const [selectedStore, setSelectedStore] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [showCart, setShowCart] = useState(false);

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

    const calculateTotal = () => {
        return cart.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
    };

    const getItemCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    // Add these state variables after existing useState declarations:
    const [toast, setToast] = useState<{
        message: string;
        type: "success" | "error";
    } | null>(null);

    // Add toast function
    const showToast = (message: string, type: "success" | "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000); // Auto-hide after 3 seconds
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

    // Auto-select store if only one available
    useEffect(() => {
        if (stores && stores.length > 0 && !selectedStore) {
            // Auto-select first store if multiple stores, or the only store if just one
            setSelectedStore(stores[0].id);
        }
    }, [stores, selectedStore]);

    if (productsLoading || storesLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading POS...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Store Selection */}

            {/* Store Selection - Always show if stores exist */}
            {stores.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {stores.length === 1 ? "Store" : "Select Store"}
                    </label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        disabled={stores.length === 1}
                        className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            stores.length === 1
                                ? "bg-gray-50 cursor-not-allowed"
                                : ""
                        }`}
                    >
                        {stores.map((store: Store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Products Grid */}
            {/* <div className="grid grid-cols-2 gap-3">
                {[...products]
                    .sort((a, b) => a.price - b.price) // ascending order
                    // .sort((a, b) => b.price - a.price) // descending order
                    .map((product: Product) => {
                        const cartItem = cart.find(
                            (item) => item.product.id === product.id
                        );

                        return (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg shadow-sm overflow-hidden select-none"
                            >
                                <div
                                    className="p-4 cursor-pointer"
                                    onClick={() =>
                                        !cartItem && addToCart(product)
                                    }
                                >
                                    <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                                        {product.name}
                                    </h3>
                                    <p className="text-lg font-bold text-green-600 mb-3">
                                        {formatRupiah(product.price)}
                                    </p>

                                    {!cartItem ? (
                                        <div className="text-center text-blue-600 text-sm font-medium py-2">
                                            Tap to add
                                        </div>
                                    ) : (
                                        <div
                                            className="flex items-center justify-between"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        product.id,
                                                        cartItem.quantity - 1
                                                    )
                                                }
                                                className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <span className="font-semibold text-lg">
                                                {cartItem.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        product.id,
                                                        cartItem.quantity + 1
                                                    )
                                                }
                                                className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div> */}

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {[...products]
                    .sort((a, b) => a.price - b.price) // ascending order
                    .map((product: Product) => {
                        const cartItem = cart.find(
                            (item) => item.product.id === product.id
                        );

                        return (
                            <div
                                key={product.id}
                                className="bg-white rounded-xl shadow-sm overflow-hidden select-none"
                            >
                                <div
                                    className="p-[0.8rem] cursor-pointer"
                                    onClick={() =>
                                        !cartItem && addToCart(product)
                                    }
                                >
                                    {/* Product Image */}
                                    {product.image_url && (
                                        <div className="flex-shrink-0">
                                            <Image
                                                src={product.image_url}
                                                alt={product.name}
                                                width={70} // smaller size for compact grid
                                                height={70}
                                                className="rounded object-cover"
                                            />
                                        </div>
                                    )}

                                    <h3 className="font-semibold text-gray-800 text-xl">
                                        {product.name}
                                    </h3>
                                    <p className="text-xl font-bold text-green-600 mb-2">
                                        {formatRupiah(product.price)}
                                    </p>

                                    {!cartItem ? (
                                        <div className="text-center text-blue-600 text-sm font-medium py-2">
                                            Tap to add
                                        </div>
                                    ) : (
                                        <div
                                            className="flex items-center justify-between"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        product.id,
                                                        cartItem.quantity - 1
                                                    )
                                                }
                                                className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                            >
                                                <Minus size={20} />
                                            </button>
                                            <span className="font-semibold text-lg">
                                                {cartItem.quantity}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    updateQuantity(
                                                        product.id,
                                                        cartItem.quantity + 1
                                                    )
                                                }
                                                className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <div className="fixed bottom-20 right-4 z-10">
                    <button
                        onClick={() => setShowCart(true)}
                        className="bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 relative"
                    >
                        <ShoppingCart size={32} />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 text-base flex items-center justify-center">
                            {getItemCount()}
                        </span>
                    </button>
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                // <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
                //     <div className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto">
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
                    onClick={() => setShowCart(false)}
                >
                    <div
                        className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">
                                Cart ({getItemCount()} items)
                            </h3>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X size={20} />
                            </button>
                        </div> */}
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">
                                Cart ({getItemCount()} items)
                            </h3>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => setCart([])}
                                    className="text-sm text-red-600 hover:text-red-800"
                                >
                                    Clear All
                                </button>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 space-y-4">
                            {cart.map((item) => (
                                <div
                                    key={item.product.id}
                                    className="flex justify-between items-center border-b border-gray-100 pb-4"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-medium text-xl">
                                            {item.product.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {formatRupiah(item.product.price)}{" "}
                                            each
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={() =>
                                                updateQuantity(
                                                    item.product.id,
                                                    item.quantity - 1
                                                )
                                            }
                                            className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="font-semibold w-8 text-center">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() =>
                                                updateQuantity(
                                                    item.product.id,
                                                    item.quantity + 1
                                                )
                                            }
                                            className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4">
                                <div className="text-right mb-4">
                                    <p className="text-2xl font-bold">
                                        Total: {formatRupiah(calculateTotal())}
                                    </p>
                                </div>

                                <button
                                    onClick={processOrder}
                                    disabled={processing || !selectedStore}
                                    className="w-full bg-green-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing
                                        ? "Processing..."
                                        : "Complete Order"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification - ADD IT HERE */}
            {toast && (
                <div
                    className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
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
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
