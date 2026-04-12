"use client";

import { Drawer } from "vaul";
import { Plus, Minus, ShoppingCart, X, Trash2, RefreshCw } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import type { CartItem } from "./MobilePOS";
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { QrisCode } from "./QrisCode";
import { useQrisPayment } from "@/lib/hooks/payments/useQrisPayment";

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
    onShowToast: (message: string, type: "success" | "error") => void;
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
    onShowToast,
}: CartDrawerProps) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
    const [showSuccess, setShowSuccess] = useState(false); // ← added

    const total = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + item.product.price * item.quantity,
                0,
            ),
        [cart],
    );

    // ── Success handler ──────────────────────────────────────────────────────
    const handleQrisSuccess = useCallback(() => {
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            onClose();
            onClearCart();
            onShowToast(
                `Order processed! Total: ${formatRupiah(total)}`,
                "success",
            );
        }, 1500);
    }, [onClose, onClearCart, onShowToast, total]);

    // ── QRIS hook ────────────────────────────────────────────────────────────
    const {
        status: qrisStatus,
        qrString,
        amount,
        referenceId,
        createQrisPayment,
        simulatePayment,
        isStaging,
    } = useQrisPayment({
        selectedStoreId,
        cart,
        onSuccess: handleQrisSuccess,
    });

    // ── Reset on close ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isOpen) {
            setPaymentMethod("cash");
            setShowSuccess(false); // ← reset
        }
    }, [isOpen]);

    // ── Auto-generate QR when switching to QRIS tab ──────────────────────────
    useEffect(() => {
        if (isOpen && paymentMethod === "qris" && cart.length > 0) {
            createQrisPayment();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, paymentMethod]);

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
                <Drawer.Content
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl focus:outline-none max-h-[90vh] flex flex-col"
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

                            {/* Payment method toggle */}
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
                    </div>

                    {/* ── Cash body ── */}
                    {paymentMethod === "cash" ? (
                        <>
                            <div
                                className="flex-1 overflow-y-auto"
                                style={{ WebkitOverflowScrolling: "touch" }}
                            >
                                <div className="px-4">
                                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-baseline gap-1">
                                        Current Order
                                        {cart.length > 0 && (
                                            <button
                                                onClick={onClearCart}
                                                className="text-red-500 px-2 hover:bg-red-50 text-sm rounded-full transition-colors"
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
                                                <CartItemRow
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

                            {/* Cash footer */}
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
                        /* ── QRIS body ── */
                        <div
                            className="flex-1 overflow-y-auto"
                            style={{ WebkitOverflowScrolling: "touch" }}
                        >
                            <div className="px-4 pt-4 pb-10 flex flex-col items-center">
                                {/* Status pill */}
                                <div className="mb-4">
                                    {qrisStatus === "loading" && (
                                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse inline-block" />
                                            Generating...
                                        </span>
                                    )}
                                    {qrisStatus === "pending" &&
                                        !showSuccess && (
                                            <span className="flex items-center gap-1 text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse inline-block" />
                                                Waiting for payment
                                            </span>
                                        )}
                                    {showSuccess && (
                                        <span className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-3 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                                            Paid
                                        </span>
                                    )}
                                    {(qrisStatus === "expired" ||
                                        qrisStatus === "failed") &&
                                        !showSuccess && (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block" />
                                                {qrisStatus === "expired"
                                                    ? "Expired"
                                                    : "Failed"}
                                            </span>
                                        )}
                                </div>

                                {/* QR code / states */}
                                <div className="min-h-[220px] flex items-center justify-center">
                                    {qrisStatus === "loading" && (
                                        <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                                    )}

                                    {/* ── Success animation ── */}
                                    {showSuccess && (
                                        <div
                                            className="flex flex-col items-center justify-center gap-3"
                                            style={{
                                                animation:
                                                    "fadeIn 0.3s ease forwards",
                                            }}
                                        >
                                            <div
                                                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
                                                style={{
                                                    animation:
                                                        "scaleIn 0.4s ease forwards",
                                                }}
                                            >
                                                <svg
                                                    className="w-8 h-8 text-green-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2.5}
                                                        d="M5 13l4 4L19 7"
                                                        style={{
                                                            strokeDasharray: 30,
                                                            strokeDashoffset: 30,
                                                            animation:
                                                                "drawCheck 0.4s ease 0.2s forwards",
                                                        }}
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-green-600 font-semibold text-lg">
                                                Payment received!
                                            </p>
                                        </div>
                                    )}
                                    {!showSuccess &&
                                        (qrisStatus === "pending" ||
                                            qrisStatus === "expired" ||
                                            qrisStatus === "failed") &&
                                        qrString && (
                                            <div className="flex flex-col items-center gap-5 p-5 pb-3 border border-gray-200 rounded-2xl">
                                                <QrisCode
                                                    value={qrString}
                                                    size={240}
                                                />
                                                <button
                                                    onClick={createQrisPayment}
                                                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                                >
                                                    <RefreshCw size={14} />
                                                    Generate New QR
                                                </button>
                                            </div>
                                        )}
                                </div>

                                {/* Amount */}
                                {qrisStatus !== "loading" && !showSuccess && (
                                    <div className="mt-4 text-center">
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatRupiah(amount ?? total)}
                                        </p>
                                    </div>
                                )}

                                {/* Reference ID */}
                                {referenceId && !showSuccess && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Ref: {referenceId}
                                    </p>
                                )}

                                {/* Simulate — staging only */}
                                {isStaging &&
                                    qrisStatus === "pending" &&
                                    !showSuccess && (
                                        <button
                                            onClick={simulatePayment}
                                            className="mt-3 px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                                        >
                                            Simulate Payment
                                        </button>
                                    )}
                            </div>
                        </div>
                    )}
                </Drawer.Content>
            </Drawer.Portal>

            {/* Animation keyframes */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.5); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes drawCheck {
                    to { stroke-dashoffset: 0; }
                }
            `}</style>
        </Drawer.Root>
    );
});

// ============================================================================
// CART ITEM ROW
// ============================================================================

interface CartItemRowProps {
    item: CartItem;
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveFromCart: (productId: string) => void;
}

const CartItemRow = memo(function CartItemRow({
    item,
    onUpdateQuantity,
    onRemoveFromCart,
}: CartItemRowProps) {
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
                    className="w-8 h-8 text-red-500 rounded-lg flex items-center justify-center border border-red-300"
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
