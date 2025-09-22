// components/CartSidebar.tsx
import React from "react";
import { CartItem, Store } from "../types/pos";

interface CartSidebarProps {
    cart: CartItem[];
    stores: Store[];
    selectedStore: string;
    processing: boolean;
    onStoreSelect: (storeId: string) => void;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onProcessOrder: () => void;
    calculateTotal: () => number;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
    cart,
    stores,
    selectedStore,
    processing,
    onStoreSelect,
    onUpdateQuantity,
    onProcessOrder,
    calculateTotal,
}) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow h-fit">
            <h2 className="text-xl font-semibold mb-4">Cart</h2>

            {/* Store Selection */}
            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Store</label>
                <select
                    value={selectedStore}
                    onChange={(e) => onStoreSelect(e.target.value)}
                    className="w-full p-2 border rounded"
                >
                    <option value="">Select store...</option>
                    {stores?.map((store: Store) => (
                        <option key={store.id} value={store.id}>
                            {store.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
                <p className="text-gray-500">Cart is empty</p>
            ) : (
                <div className="space-y-4">
                    {cart.map((item) => (
                        <div
                            key={item.product.id}
                            className="flex justify-between items-center border-b pb-3"
                        >
                            <div className="flex-1">
                                <h4 className="font-medium">
                                    {item.product.name}
                                </h4>
                                <p className="text-sm text-gray-600">
                                    Rp {item.product.price} each
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() =>
                                        onUpdateQuantity(
                                            item.product.id,
                                            item.quantity - 1
                                        )
                                    }
                                    className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                                >
                                    -
                                </button>
                                <span className="w-8 text-center">
                                    {item.quantity}
                                </span>
                                <button
                                    onClick={() =>
                                        onUpdateQuantity(
                                            item.product.id,
                                            item.quantity + 1
                                        )
                                    }
                                    className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="text-right">
                        <p className="text-2xl font-bold">
                            Total: Rp {calculateTotal()}
                        </p>
                    </div>

                    <button
                        onClick={onProcessOrder}
                        disabled={processing || !selectedStore}
                        className="w-full bg-green-500 text-white py-3 rounded text-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                    >
                        {processing ? "Processing..." : "Process Order"}
                    </button>
                </div>
            )}
        </div>
    );
};
