"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { useProducts } from "@/lib/hooks/products/useProducts";
import { useCart } from "@/lib/hooks/orders/useCart";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useAuth } from "@/lib/context/AuthContext";
import { useFastOrderMode } from "@/lib/context/FastOrderModeContext";
import type { ProductResponse } from "@tea-pos/features/products/schema";
import { CartDrawer } from "./CartDrawer";
import { useIsIPhonePWA } from "@/lib/usePWA";
import { Lock, Loader2 } from "lucide-react";

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
            className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden select-none relative cursor-pointer hover:shadow-md ${dimmed ? "opacity-90" : ""}`}
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
                <div className="text-center text-brand text-sm font-medium py-1.5 rounded-lg border border-brand">
                    Tap to add
                </div>
            </div>
        </div>
    );
});

// ─── Gate Overlay — POS take-over flow only ───────────────────────────────────

function TakeOverCard({ onTransfer }: { onTransfer: (code: string) => Promise<unknown> }) {
    const [claimCode, setClaimCode] = useState("");
    const [transferError, setTransferError] = useState<string | null>(null);
    const [isTransferring, setIsTransferring] = useState(false);

    const handleTakeOver = async () => {
        if (claimCode.length !== 2) return;
        setIsTransferring(true);
        setTransferError(null);
        try {
            await onTransfer(claimCode);
        } catch (err) {
            setTransferError(err instanceof Error ? err.message : "Invalid code");
        } finally {
            setIsTransferring(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-xs text-center mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-gray-500" />
            </div>
            <p className="font-semibold text-gray-900 text-lg">POS is in use</p>
            <p className="text-sm text-gray-500 mt-1.5 mb-5">
                Ask the current seller for their 2-digit code to take over.
            </p>
            <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={claimCode}
                onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                    setClaimCode(v);
                    setTransferError(null);
                }}
                placeholder="––"
                className="w-20 text-center text-3xl font-bold font-mono tracking-widest border-b-2 border-gray-300 focus:border-brand focus:outline-none bg-transparent mx-auto block mb-4"
            />
            {transferError && (
                <p className="text-xs text-red-500 mb-3">{transferError}</p>
            )}
            <button
                onClick={handleTakeOver}
                disabled={claimCode.length !== 2 || isTransferring}
                className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
                {isTransferring ? (
                    <Loader2 size={16} className="animate-spin mx-auto" />
                ) : (
                    "Take Over"
                )}
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobilePOS() {
    const { selectedStoreId } = useStore();
    const { gate, session, transferSession } = useSession(selectedStoreId);
    const { profile } = useAuth();
    const { fastOrderMode } = useFastOrderMode();
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const isIPhonePWA = useIsIPhonePWA();

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

    const showOverlay =
        gate === "open" &&
        session?.userId !== undefined &&
        session.userId !== profile?.id;

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
            {/* Products Grid — dimmed behind overlay */}
            <div className="relative">
                <div className={showOverlay ? "opacity-20 pointer-events-none select-none" : ""}>
                    <div className="grid grid-cols-2 gap-3">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                quantityInCart={cartQuantityMap[product.id] ?? 0}
                                onAdd={addToCart}
                            />
                        ))}
                    </div>
                </div>

                {showOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <TakeOverCard onTransfer={transferSession} />
                    </div>
                )}
            </div>

            {/* Sticky Bottom Bar */}
            {cart.length > 0 && !showOverlay && (
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
        </div>
    );
}
