// //components/mobile/MobilePOS.tsx
// "use client";
// import { useState, useEffect } from "react";
// import { useProducts, useStores } from "@/lib/hooks/useData";
// import { Profile, Product, CartItem, Store } from "@/lib/types";
// import { Plus, Minus, ShoppingCart, X } from "lucide-react";
// import { formatRupiah } from "@/lib/utils/formatCurrency";
// import Image from "next/image";

// interface MobilePOSProps {
//     profile: Profile | null;
// }

// export default function MobilePOS({ profile }: MobilePOSProps) {
//     const { data: products = [], isLoading: productsLoading } = useProducts();
//     const { data: stores = [], isLoading: storesLoading } = useStores(
//         profile?.role ?? "",
//         profile?.id ?? ""
//     );

//     const [selectedStore, setSelectedStore] = useState<string>("");
//     const [cart, setCart] = useState<CartItem[]>([]);
//     const [processing, setProcessing] = useState(false);
//     const [showCart, setShowCart] = useState(false);

//     const addToCart = (product: Product) => {
//         setCart((prev) => {
//             const existing = prev.find(
//                 (item) => item.product.id === product.id
//             );
//             if (existing) {
//                 return prev.map((item) =>
//                     item.product.id === product.id
//                         ? { ...item, quantity: item.quantity + 1 }
//                         : item
//                 );
//             }
//             return [...prev, { product, quantity: 1 }];
//         });
//     };

//     const updateQuantity = (productId: string, quantity: number) => {
//         if (quantity <= 0) {
//             setCart((prev) =>
//                 prev.filter((item) => item.product.id !== productId)
//             );
//         } else {
//             setCart((prev) =>
//                 prev.map((item) =>
//                     item.product.id === productId ? { ...item, quantity } : item
//                 )
//             );
//         }
//     };

//     const calculateTotal = () => {
//         return cart.reduce(
//             (sum, item) => sum + item.product.price * item.quantity,
//             0
//         );
//     };

//     const getItemCount = () => {
//         return cart.reduce((count, item) => count + item.quantity, 0);
//     };

//     // Add these state variables after existing useState declarations:
//     const [toast, setToast] = useState<{
//         message: string;
//         type: "success" | "error";
//     } | null>(null);

//     // Add toast function
//     const showToast = (message: string, type: "success" | "error") => {
//         setToast({ message, type });
//         setTimeout(() => setToast(null), 3000); // Auto-hide after 3 seconds
//     };

//     const processOrder = async () => {
//         if (!selectedStore || cart.length === 0) {
//             showToast("Please select a store and add items to cart", "error");
//             return;
//         }

//         setProcessing(true);

//         const items = cart.map((item) => ({
//             productId: item.product.id,
//             quantity: item.quantity,
//             unitPrice: item.product.price,
//         }));

//         try {
//             const response = await fetch("/api/orders", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                     storeId: selectedStore,
//                     items,
//                 }),
//             });

//             const data = await response.json();

//             if (data.success) {
//                 showToast(
//                     `Order processed! Total: ${formatRupiah(data.totalAmount)}`,
//                     "success"
//                 );
//                 setCart([]);
//                 setShowCart(false);
//             } else {
//                 showToast("Failed to process order: " + data.error, "error");
//             }
//         } catch (error) {
//             showToast("Error processing order", "error");
//             console.log(error);
//         } finally {
//             setProcessing(false);
//         }
//     };

//     // Auto-select store if only one available
//     useEffect(() => {
//         if (stores && stores.length > 0 && !selectedStore) {
//             // Auto-select first store if multiple stores, or the only store if just one
//             setSelectedStore(stores[0].id);
//         }
//     }, [stores, selectedStore]);

//     if (productsLoading || storesLoading) {
//         return (
//             <div className="text-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
//                 <p className="text-gray-600">Loading POS...</p>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-4">
//             {/* Store Selection */}

//             {/* Store Selection - Always show if stores exist */}
//             {stores.length > 0 && (
//                 <div className="bg-white p-4 rounded-lg shadow-sm">
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                         {stores.length === 1 ? "Store" : "Select Store"}
//                     </label>
//                     <select
//                         value={selectedStore}
//                         onChange={(e) => setSelectedStore(e.target.value)}
//                         disabled={stores.length === 1}
//                         className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
//                             stores.length === 1
//                                 ? "bg-gray-50 cursor-not-allowed"
//                                 : ""
//                         }`}
//                     >
//                         {stores.map((store: Store) => (
//                             <option key={store.id} value={store.id}>
//                                 {store.name}
//                             </option>
//                         ))}
//                     </select>
//                 </div>
//             )}

//             {/* Products Grid */}
//             <div className="grid grid-cols-2 gap-3">
//                 {[...products]
//                     .sort((a, b) => a.price - b.price) // ascending order
//                     .map((product: Product) => {
//                         const cartItem = cart.find(
//                             (item) => item.product.id === product.id
//                         );

//                         return (
//                             <div
//                                 key={product.id}
//                                 className="bg-white rounded-xl shadow-sm overflow-hidden select-none"
//                             >
//                                 <div
//                                     className="p-[0.5rem] cursor-pointer"
//                                     onClick={() =>
//                                         !cartItem && addToCart(product)
//                                     }
//                                 >
//                                     {/* Product Image */}
//                                     {product.image_url && (
//                                         <div className="flex gap-1 rounded-lg p-1">
//                                             <div className="flex-shrink-0 p-1 rounded-lg">
//                                                 <Image
//                                                     src={product.image_url}
//                                                     alt={product.name}
//                                                     width={50} // smaller size for compact grid
//                                                     height={50}
//                                                     className="rounded object-cover"
//                                                 />
//                                             </div>

//                                             <div>
//                                                 <h3 className="font-semibold text-gray-800 text-xl">
//                                                     {product.name}
//                                                 </h3>
//                                                 <p className="text-xl font-bold text-green-600 mb-2">
//                                                     {formatRupiah(
//                                                         product.price
//                                                     )}
//                                                 </p>
//                                             </div>
//                                         </div>
//                                     )}

//                                     {!cartItem ? (
//                                         <div className="text-center text-white text-sm font-medium py-3.5 bg-blue-500 rounded-xl">
//                                             Tap to add
//                                         </div>
//                                     ) : (
//                                         <div
//                                             className="flex items-center justify-between"
//                                             onClick={(e) => e.stopPropagation()}
//                                         >
//                                             <button
//                                                 onClick={() =>
//                                                     updateQuantity(
//                                                         product.id,
//                                                         cartItem.quantity - 1
//                                                     )
//                                                 }
//                                                 className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
//                                             >
//                                                 <Minus size={20} />
//                                             </button>
//                                             <span className="font-semibold text-lg">
//                                                 {cartItem.quantity}
//                                             </span>
//                                             <button
//                                                 onClick={() =>
//                                                     updateQuantity(
//                                                         product.id,
//                                                         cartItem.quantity + 1
//                                                     )
//                                                 }
//                                                 className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600"
//                                             >
//                                                 <Plus size={20} />
//                                             </button>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         );
//                     })}
//             </div>

//             {/* Floating Cart Button */}
//             {cart.length > 0 && (
//                 <div className="fixed bottom-20 right-4 z-10">
//                     <button
//                         onClick={() => setShowCart(true)}
//                         className="bg-green-500 text-white rounded-full p-4 shadow-lg hover:bg-green-600 relative"
//                     >
//                         <ShoppingCart size={32} />
//                         <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 text-base flex items-center justify-center">
//                             {getItemCount()}
//                         </span>
//                     </button>
//                 </div>
//             )}

//             {/* Cart Modal */}
//             {showCart && (
//                 <div
//                     className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
//                     onClick={() => setShowCart(false)}
//                 >
//                     <div
//                         className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto"
//                         onClick={(e) => e.stopPropagation()}
//                     >
//                         <div className="p-4 border-b border-gray-200 flex justify-between items-center">
//                             <h3 className="text-lg font-semibold">
//                                 Cart ({getItemCount()} items)
//                             </h3>
//                             <div className="flex items-center space-x-3">
//                                 <button
//                                     onClick={() => setCart([])}
//                                     className="text-sm text-red-600 hover:text-red-800"
//                                 >
//                                     Clear All
//                                 </button>
//                                 <button
//                                     onClick={() => setShowCart(false)}
//                                     className="p-1 hover:bg-gray-100 rounded"
//                                 >
//                                     <X size={20} />
//                                 </button>
//                             </div>
//                         </div>

//                         <div className="p-4 space-y-4">
//                             {cart.map((item) => (
//                                 <div
//                                     key={item.product.id}
//                                     className="flex justify-between items-center border-b border-gray-100 pb-4"
//                                 >
//                                     <div className="flex-1">
//                                         <h4 className="font-medium text-xl">
//                                             {item.product.name}
//                                         </h4>
//                                         <p className="text-sm text-gray-600">
//                                             {formatRupiah(item.product.price)}{" "}
//                                             each
//                                         </p>
//                                     </div>
//                                     <div className="flex items-center space-x-3">
//                                         <button
//                                             onClick={() =>
//                                                 updateQuantity(
//                                                     item.product.id,
//                                                     item.quantity - 1
//                                                 )
//                                             }
//                                             className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"
//                                         >
//                                             <Minus size={14} />
//                                         </button>
//                                         <span className="font-semibold w-8 text-center">
//                                             {item.quantity}
//                                         </span>
//                                         <button
//                                             onClick={() =>
//                                                 updateQuantity(
//                                                     item.product.id,
//                                                     item.quantity + 1
//                                                 )
//                                             }
//                                             className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center"
//                                         >
//                                             <Plus size={14} />
//                                         </button>
//                                     </div>
//                                 </div>
//                             ))}

//                             <div className="pt-4">
//                                 <div className="text-right mb-4">
//                                     <p className="text-2xl font-bold">
//                                         Total: {formatRupiah(calculateTotal())}
//                                     </p>
//                                 </div>

//                                 <button
//                                     onClick={processOrder}
//                                     disabled={processing || !selectedStore}
//                                     className="w-full bg-green-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
//                                 >
//                                     {processing
//                                         ? "Processing..."
//                                         : "Complete Order"}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* Toast Notification - ADD IT HERE */}
//             {toast && (
//                 <div
//                     className={`fixed top-20 left-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
//                         toast.type === "success"
//                             ? "bg-green-500 text-white"
//                             : "bg-red-500 text-white"
//                     }`}
//                 >
//                     <div className="flex justify-between items-center">
//                         <span className="font-medium">{toast.message}</span>
//                         <button
//                             onClick={() => setToast(null)}
//                             className="ml-4 text-white hover:opacity-75"
//                         >
//                             ×
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

//components/mobile/MobilePOS.tsx
"use client";
import { useState, useEffect } from "react";
import { useProducts, useStores } from "@/lib/hooks/useData";
import { Profile, Product, CartItem, Store } from "@/lib/types";
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
        <div className="space-y-4 pb-24">
            {" "}
            {/* Added bottom padding for sticky bar */}
            {/* Store Selection - Always show if stores exist */}
            {stores.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <Store1 size={20} className="text-gray-600" />

                        <label className="block text-base font-semibold">
                            {stores.length === 1
                                ? "Your Store"
                                : "Select Store"}
                        </label>
                    </div>

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
            <div className="grid grid-cols-2 gap-3">
                {[...products]
                    .sort((a, b) => a.price - b.price)
                    .map((product: Product) => {
                        const quantityInCart = getProductQuantityInCart(
                            product.id
                        );

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
                                className="px-3 py-2 border border-blue-500 text-blue-500 rounded-lg font-medium hover:bg-blue-50"
                            >
                                View Cart
                            </button>
                            <button
                                onClick={processOrder}
                                disabled={processing || !selectedStore}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? "Processing..." : "Confirm Now"}
                            </button>
                        </div>
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
                        className="bg-white w-full rounded-t-2xl max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h3 className="text-xl font-semibold">Cart</h3>
                            <button
                                onClick={() => setShowCart(false)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="px-4 pt-4">
                            <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                                Current Order
                                {cart.length > 0 && (
                                    <button
                                        onClick={() => setCart([])}
                                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg text-sm"
                                    >
                                        {/* <Trash2 size={20} /> */}
                                        Clear All
                                    </button>
                                )}
                            </h4>

                            {cart.length === 0 ? (
                                <div className="text-center text-gray-500 my-30 ">
                                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p>No items in cart</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
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
                                                            item.product.price
                                                        )}{" "}
                                                        / Pcs
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-lg font-bold text-gray-900">
                                                        {formatRupiah(
                                                            item.product.price *
                                                                item.quantity
                                                        )}
                                                    </p>
                                                    {/* <button
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.product.id
                                                            )
                                                        }
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button> */}
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
                                                    // className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                                    className="w-8 h-8 text-red-500 rounded-full flex items-center justify-center border-1"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.product.id,
                                                                item.quantity -
                                                                    1
                                                            )
                                                        }
                                                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                    <span className="font-semibold text-lg w-8 text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.product.id,
                                                                item.quantity +
                                                                    1
                                                            )
                                                        }
                                                        className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cart Total and Actions */}
                            {/* <div className="fixed bottom-16 left-0 right-0 bg-white border-y border-gray-400 p-4 z-40 "> */}

                            {/* <div className="mt-6 pt-4 border-t border-gray-200 "> */}
                            <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 pb-4 border-t border-gray-200">
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
                                    className="w-full bg-green-500 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing
                                        ? "Processing..."
                                        : "Confirm Order"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Toast Notification */}
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
