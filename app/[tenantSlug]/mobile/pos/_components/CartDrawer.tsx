"use client";

import { Drawer } from "vaul";
import { Plus, Minus, ShoppingCart, X, Trash2, QrCode } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import type { CartItem } from "./MobilePOS";
import { useState, useEffect, useMemo, memo } from "react";

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    cart: CartItem[];
    onClearCart: () => void;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onProcessOrder: () => void;
    processing: boolean;
    selectedStoreId: string | null;
}

type PaymentMethod = "cash" | "qris";

export const CartDrawer = memo(function CartDrawer({
    isOpen,
    onClose,
    cart,
    onClearCart,
    onUpdateQuantity,
    onRemoveFromCart,
    onProcessOrder,
    processing,
    selectedStoreId,
}: CartDrawerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

    // Reset to cash whenever drawer closes — avoids stale QRIS state on reopen
    useEffect(() => {
        if (!isOpen) setPaymentMethod("cash");
    }, [isOpen]);

    const total = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + item.product.price * item.quantity,
                0,
            ),
        [cart],
    );

    return (
        <Drawer.Root
            open={isOpen}
            dismissible={false}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                    const scrollY = window.scrollY;
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollY);
                    });
                }
            }}
        >
            <Drawer.Portal>
                <Drawer.Overlay
                    className="fixed inset-0 bg-black/60 z-50"
                    onClick={onClose}
                />
                {/*
                 * translate-z(0) forces GPU layer on older Android WebViews —
                 * prevents the common "drawer paints late" flicker on mid-range devices
                 */}
                <Drawer.Content
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl focus:outline-none max-h-[80vh] flex flex-col"
                    style={{ transform: "translateZ(0)" }}
                >
                    {/* Header */}
                    <div className="shrink-0 px-4 pt-4 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -ml-2"
                                >
                                    <X size={24} />
                                </button>
                                <Drawer.Title className="text-xl font-bold text-gray-900">
                                    Cart
                                </Drawer.Title>
                            </div>

                            {/* Payment toggle */}
                            <div className="flex items-center bg-gray-100 rounded-full p-1">
                                <button
                                    onClick={() => setPaymentMethod("cash")}
                                    className={`px-3.5 py-1 rounded-full text-sm font-semibold transition-all duration-200 ${
                                        paymentMethod === "cash"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500"
                                    }`}
                                >
                                    Cash
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("qris")}
                                    className={`px-3.5 py-1 rounded-full text-sm font-semibold transition-all duration-200 ${
                                        paymentMethod === "qris"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500"
                                    }`}
                                >
                                    QRIS
                                </button>
                            </div>
                        </div>
                        <div className="h-px bg-gray-200 -mx-4 mt-4" />
                    </div>

                    {/* Body */}
                    {paymentMethod === "cash" ? (
                        <>
                            {/*
                             * overflow-y-auto with -webkit-overflow-scrolling for
                             * momentum scrolling on older iOS (pre-15) and slow Androids
                             */}
                            <div
                                className="flex-1 overflow-y-auto"
                                style={{ WebkitOverflowScrolling: "touch" }}
                            >
                                <div className="px-4 pt-2">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                                        Current Order
                                        {cart.length > 0 && (
                                            <button
                                                onClick={onClearCart}
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
                                                <CartItem
                                                    key={item.product.id}
                                                    item={item}
                                                    onUpdateQuantity={
                                                        onUpdateQuantity
                                                    }
                                                    onRemoveFromCart={
                                                        onRemoveFromCart
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="shrink-0 bg-white px-4 pt-4 pb-8 border-t border-gray-200">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xl font-bold text-gray-900">
                                        Total Transaction
                                    </span>
                                    <span className="text-xl font-bold text-gray-900">
                                        {formatRupiah(total)}
                                    </span>
                                </div>
                                <button
                                    onClick={onProcessOrder}
                                    disabled={
                                        processing ||
                                        !selectedStoreId ||
                                        cart.length === 0
                                    }
                                    className="w-full bg-green-500 text-white py-4 rounded-xl text-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {processing
                                        ? "Processing..."
                                        : "Confirm Order"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-12">
                            <QrCode
                                size={96}
                                strokeWidth={1}
                                className="text-gray-300"
                            />
                            <p className="text-sm text-gray-400 font-medium">
                                QRIS coming soon
                            </p>
                        </div>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
});

// ─── Extracted + memoised so only the tapped row re-renders ──────────────────

interface CartItemProps {
    item: CartItem;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveFromCart: (productId: string) => void;
}

const CartItem = memo(function CartItem({
    item,
    onUpdateQuantity,
    onRemoveFromCart,
}: CartItemProps) {
    return (
        <div className="border-b border-gray-100 pb-4 last:border-b-0">
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h5 className="font-medium text-lg text-gray-900">
                        {item.product.name}
                    </h5>
                    <p className="text-sm text-gray-600">
                        {item.quantity} x {formatRupiah(item.product.price)} /
                        Pcs
                    </p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                    {formatRupiah(item.product.price * item.quantity)}
                </p>
            </div>
            <div className="flex items-center justify-between">
                <button
                    onClick={() => onRemoveFromCart(item.product.id)}
                    className="w-8 h-8 text-red-500 rounded-full flex items-center justify-center border border-red-200 hover:bg-red-50 transition-colors"
                >
                    <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() =>
                            onUpdateQuantity(item.product.id, item.quantity - 1)
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
                            onUpdateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
});
