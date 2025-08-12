"use client";
import { useState, useEffect } from "react";
import { useProducts, useStores } from "@/lib/hooks/useData";
import { Profile, Product, CartItem, Store } from "@/lib/types";
import { Plus, Minus, ShoppingCart, X } from "lucide-react";

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

    // Auto-select store if only one available
    useEffect(() => {
        if (stores && stores.length === 1 && !selectedStore) {
            setSelectedStore(stores[0].id);
        }
    }, [stores, selectedStore]);

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

    const processOrder = async () => {
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
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert(
                    `Order processed! Total: $${data.totalAmount.toFixed(2)}`
                );
                setCart([]);
                setShowCart(false);
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
            {stores.length > 1 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Store
                    </label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Choose store...</option>
                        {stores.map((store: Store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Products Grid */}
            <div className="grid grid-cols-2 gap-3">
                {products.map((product: Product) => {
                    const cartItem = cart.find(
                        (item) => item.product.id === product.id
                    );

                    return (
                        // <div
                        //     key={product.id}
                        //     className="bg-white rounded-lg shadow-sm overflow-hidden"
                        // >
                        //     <div className="p-4">
                        //         <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                        //             {product.name}
                        //         </h3>
                        //         <p className="text-lg font-bold text-green-600 mb-3">
                        //             ${product.price.toFixed(2)}
                        //         </p>

                        //         {!cartItem ? (
                        //             <button
                        //                 onClick={() => addToCart(product)}
                        //                 className="w-full bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center justify-center"
                        //             >
                        //                 <Plus size={16} className="mr-1" />
                        //                 Add
                        //             </button>
                        //         ) : (
                        //             <div className="flex items-center justify-between">
                        //                 <button
                        //                     onClick={() =>
                        //                         updateQuantity(
                        //                             product.id,
                        //                             cartItem.quantity - 1
                        //                         )
                        //                     }
                        //                     className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
                        //                 >
                        //                     <Minus size={14} />
                        //                 </button>
                        //                 <span className="font-semibold">
                        //                     {cartItem.quantity}
                        //                 </span>
                        //                 <button
                        //                     onClick={() =>
                        //                         updateQuantity(
                        //                             product.id,
                        //                             cartItem.quantity + 1
                        //                         )
                        //                     }
                        //                     className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center"
                        //                 >
                        //                     <Plus size={14} />
                        //                 </button>
                        //             </div>
                        //         )}
                        //     </div>
                        // </div>
                        // Replace the entire product card div with:
                        // <div
                        //     key={product.id}
                        //     className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
                        //     onClick={() => addToCart(product)}
                        // >
                        //     <div className="p-4">
                        //         <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                        //             {product.name}
                        //         </h3>
                        //         <p className="text-lg font-bold text-green-600 mb-3">
                        //             ${product.price.toFixed(2)}
                        //         </p>

                        //         {cartItem && (
                        //             <div className="flex items-center justify-center bg-blue-50 py-2 rounded-lg">
                        //                 <span className="text-blue-600 font-semibold">
                        //                     {cartItem.quantity} in cart
                        //                 </span>
                        //             </div>
                        //         )}

                        //         {!cartItem && (
                        //             <div className="text-center text-blue-600 text-sm font-medium">
                        //                 Tap to add
                        //             </div>
                        //         )}
                        //     </div>
                        // </div>
                        <div
                            key={product.id}
                            className="bg-white rounded-lg shadow-sm overflow-hidden"
                        >
                            <div
                                className="p-4 cursor-pointer"
                                onClick={() => !cartItem && addToCart(product)}
                            >
                                <h3 className="font-semibold text-gray-800 mb-1 text-sm">
                                    {product.name}
                                </h3>
                                <p className="text-lg font-bold text-green-600 mb-3">
                                    ${product.price.toFixed(2)}
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
            </div>

            {/* Floating Cart Button */}
            {cart.length > 0 && (
                <div className="fixed bottom-20 right-4 z-10">
                    <button
                        onClick={() => setShowCart(true)}
                        className="bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 relative"
                    >
                        <ShoppingCart size={24} />
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">
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
                                        <h4 className="font-medium">
                                            {item.product.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            ${item.product.price.toFixed(2)}{" "}
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
                                        Total: ${calculateTotal().toFixed(2)}
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
        </div>
    );
}
