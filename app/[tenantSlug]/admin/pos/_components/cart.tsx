// app/[tenantSlug]/admin/pos/_components/cart.tsx
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2 } from "lucide-react";
import type { CartItem } from "../page";

interface CartProps {
    cart: CartItem[];
    onUpdateQuantity: (productId: string, quantity: number) => void;
    onRemoveFromCart: (productId: string) => void;
    onClearCart: () => void;
    onProcessOrder: () => void;
    processing: boolean;
    selectedStore: string;
}

export function Cart({
    cart,
    onUpdateQuantity,
    onRemoveFromCart,
    onClearCart,
    onProcessOrder,
    processing,
    selectedStore,
}: CartProps) {
    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateTotal = () => {
        return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    return (
        <div className="flex flex-col mt-8">
            <div className="w-80 mx-auto bg-background border rounded-lg flex flex-col flex-1 overflow-hidden">
                {/* Cart Header */}
                <div className="p-4 py-2.5 flex items-center justify-between rounded-t-2xl border-b bg-muted/60">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Cart</h2>
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-3">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <span className="text-4xl mb-3">🍪</span>
                            <p className="text-sm font-medium">
                                Your cart is empty.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">
                                    Current Order
                                </h3>

                                {cart.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClearCart}
                                        className="text-destructive text-xs border rounded-full"
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </div>

                            {cart.map((item) => {
                                const itemTotal = item.price * item.quantity;

                                return (
                                    <div
                                        key={item.productId}
                                        className="flex flex-col border rounded-lg p-3 bg-card"
                                    >
                                        {/* Top row: name + total */}
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex gap-3 flex-1">
                                                {item.imageUrl && (
                                                    <img
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        className="w-10 h-10 rounded-md object-cover shadow"
                                                    />
                                                )}
                                                <div>
                                                    <h4 className="font-semibold text-sm line-clamp-1">
                                                        {item.name}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {item.quantity} ×{" "}
                                                        {formatRupiah(
                                                            item.price
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-semibold text-sm text-right">
                                                {formatRupiah(itemTotal)}
                                            </span>
                                        </div>

                                        {/* Bottom row: quantity controls */}
                                        <div className="flex items-center justify-between mt-1">
                                            {/* Trash button (left) */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:bg-destructive/10 border rounded-full"
                                                onClick={() =>
                                                    onRemoveFromCart(
                                                        item.productId
                                                    )
                                                }
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>

                                            {/* Quantity controls (right) */}
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        onUpdateQuantity(
                                                            item.productId,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="text-sm font-semibold w-6 text-center">
                                                    {item.quantity}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() =>
                                                        onUpdateQuantity(
                                                            item.productId,
                                                            item.quantity + 1
                                                        )
                                                    }
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Cart Footer */}
                <div className="p-4 border-t bg-muted/30 rounded-b-2xl space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">
                            Total Transaction
                        </span>
                        <span className="font-bold text-lg text-primary">
                            {formatRupiah(calculateTotal())}
                        </span>
                    </div>

                    <Button
                        onClick={onProcessOrder}
                        disabled={
                            processing || !selectedStore || cart.length === 0
                        }
                        className="w-full h-11 text-base font-semibold"
                    >
                        {processing ? "Processing..." : "Confirm Order"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
