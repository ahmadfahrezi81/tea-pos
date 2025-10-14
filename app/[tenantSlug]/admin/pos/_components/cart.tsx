// app/[tenantSlug]/admin/pos/_components/cart.tsx
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

    const getItemCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    // return (
    //     <div className="w-80 border m-2 rounded-xl bg-background flex flex-col h-screen">
    //         {/* Cart Header */}
    //         <div className="p-6 border-b">
    //             <div className="flex items-center justify-between mb-2">
    //                 <div className="flex items-center gap-2">
    //                     <ShoppingCart className="h-5 w-5" />
    //                     <h2 className="text-xl font-bold">Current Order</h2>
    //                 </div>
    //             </div>
    //             {cart.length > 0 && (
    //                 <Button
    //                     variant="ghost"
    //                     size="sm"
    //                     onClick={onClearCart}
    //                     className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full mt-2"
    //                 >
    //                     Clear All
    //                 </Button>
    //             )}
    //         </div>

    //         {/* Cart Items */}
    //         <div className="flex-1 overflow-y-auto p-6">
    //             {cart.length === 0 ? (
    //                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    //                     <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
    //                     <p className="text-sm text-center">
    //                         Your cart is empty
    //                     </p>
    //                     <p className="text-xs text-center mt-1">
    //                         Click on products to add them
    //                     </p>
    //                 </div>
    //             ) : (
    //                 <div className="space-y-4">
    //                     {cart.map((item) => (
    //                         <Card key={item.productId} className="p-4">
    //                             <div className="flex justify-between items-start mb-3">
    //                                 <div className="flex-1 pr-2">
    //                                     <h4 className="font-medium text-sm line-clamp-2">
    //                                         {item.name}
    //                                     </h4>
    //                                     <p className="text-xs text-muted-foreground mt-1">
    //                                         {formatRupiah(item.price)} ×{" "}
    //                                         {item.quantity}
    //                                     </p>
    //                                 </div>
    //                                 <p className="font-bold text-sm">
    //                                     {formatRupiah(
    //                                         item.price * item.quantity
    //                                     )}
    //                                 </p>
    //                             </div>

    //                             <div className="flex items-center justify-between">
    //                                 <Button
    //                                     variant="outline"
    //                                     size="icon"
    //                                     className="h-8 w-8 text-destructive hover:bg-destructive/10"
    //                                     onClick={() =>
    //                                         onRemoveFromCart(item.productId)
    //                                     }
    //                                 >
    //                                     <Trash2 className="h-4 w-4" />
    //                                 </Button>
    //                                 <div className="flex items-center gap-2">
    //                                     <Button
    //                                         variant="outline"
    //                                         size="icon"
    //                                         className="h-8 w-8"
    //                                         onClick={() =>
    //                                             onUpdateQuantity(
    //                                                 item.productId,
    //                                                 item.quantity - 1
    //                                             )
    //                                         }
    //                                     >
    //                                         <Minus className="h-4 w-4" />
    //                                     </Button>
    //                                     <span className="font-semibold w-8 text-center text-sm">
    //                                         {item.quantity}
    //                                     </span>
    //                                     <Button
    //                                         variant="outline"
    //                                         size="icon"
    //                                         className="h-8 w-8"
    //                                         onClick={() =>
    //                                             onUpdateQuantity(
    //                                                 item.productId,
    //                                                 item.quantity + 1
    //                                             )
    //                                         }
    //                                     >
    //                                         <Plus className="h-4 w-4" />
    //                                     </Button>
    //                                 </div>
    //                             </div>
    //                         </Card>
    //                     ))}
    //                 </div>
    //             )}
    //         </div>

    //         {/* Cart Footer */}
    //         <div className="border-t p-6 space-y-4 bg-background">
    //             <div className="space-y-2">
    //                 <div className="flex justify-between items-center text-sm">
    //                     <span className="text-muted-foreground">Items</span>
    //                     <span className="font-medium">{getItemCount()}</span>
    //                 </div>
    //                 <Separator />
    //                 <div className="flex justify-between items-center">
    //                     <span className="text-lg font-bold">Total</span>
    //                     <span className="text-2xl font-bold text-primary">
    //                         {formatRupiah(calculateTotal())}
    //                     </span>
    //                 </div>
    //             </div>
    //             <Button
    //                 onClick={onProcessOrder}
    //                 disabled={processing || !selectedStore || cart.length === 0}
    //                 className="w-full h-12 text-base font-semibold"
    //                 size="lg"
    //             >
    //                 {processing ? "Processing..." : "Confirm Order"}
    //             </Button>
    //         </div>
    //     </div>
    // );

    // return (
    //     <div className="py-6 max-h-[calc(100vh-30rem)]">
    //         <div className="w-80 bg-background border rounded-2xl shadow-sm flex flex-col h-full ">
    //             {/* Cart Header */}
    //             <div className="p-6 border-b rounded-t-2xl">
    //                 <div className="flex items-center justify-between mb-2">
    //                     <div className="flex items-center gap-2">
    //                         <ShoppingCart className="h-5 w-5" />
    //                         <h2 className="text-xl font-bold">Current Order</h2>
    //                     </div>
    //                 </div>
    //                 {cart.length > 0 && (
    //                     <Button
    //                         variant="ghost"
    //                         size="sm"
    //                         onClick={onClearCart}
    //                         className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full mt-2"
    //                     >
    //                         Clear All
    //                     </Button>
    //                 )}
    //             </div>

    //             {/* Cart Items */}
    //             <div className="flex-1 overflow-y-auto p-6">
    //                 {cart.length === 0 ? (
    //                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    //                         <ShoppingCart className="w-16 h-16 mb-4 opacity-20" />
    //                         <p className="text-sm text-center">
    //                             Your cart is empty
    //                         </p>
    //                         <p className="text-xs text-center mt-1">
    //                             Click on products to add them
    //                         </p>
    //                     </div>
    //                 ) : (
    //                     <div className="space-y-4">
    //                         {cart.map((item) => (
    //                             <Card key={item.productId} className="p-4">
    //                                 <div className="flex justify-between items-start mb-3">
    //                                     <div className="flex-1 pr-2">
    //                                         <h4 className="font-medium text-sm line-clamp-2">
    //                                             {item.name}
    //                                         </h4>
    //                                         <p className="text-xs text-muted-foreground mt-1">
    //                                             {formatRupiah(item.price)} ×{" "}
    //                                             {item.quantity}
    //                                         </p>
    //                                     </div>
    //                                     <p className="font-bold text-sm">
    //                                         {formatRupiah(
    //                                             item.price * item.quantity
    //                                         )}
    //                                     </p>
    //                                 </div>

    //                                 <div className="flex items-center justify-between">
    //                                     <Button
    //                                         variant="outline"
    //                                         size="icon"
    //                                         className="h-8 w-8 text-destructive hover:bg-destructive/10"
    //                                         onClick={() =>
    //                                             onRemoveFromCart(item.productId)
    //                                         }
    //                                     >
    //                                         <Trash2 className="h-4 w-4" />
    //                                     </Button>
    //                                     <div className="flex items-center gap-2">
    //                                         <Button
    //                                             variant="outline"
    //                                             size="icon"
    //                                             className="h-8 w-8"
    //                                             onClick={() =>
    //                                                 onUpdateQuantity(
    //                                                     item.productId,
    //                                                     item.quantity - 1
    //                                                 )
    //                                             }
    //                                         >
    //                                             <Minus className="h-4 w-4" />
    //                                         </Button>
    //                                         <span className="font-semibold w-8 text-center text-sm">
    //                                             {item.quantity}
    //                                         </span>
    //                                         <Button
    //                                             variant="outline"
    //                                             size="icon"
    //                                             className="h-8 w-8"
    //                                             onClick={() =>
    //                                                 onUpdateQuantity(
    //                                                     item.productId,
    //                                                     item.quantity + 1
    //                                                 )
    //                                             }
    //                                         >
    //                                             <Plus className="h-4 w-4" />
    //                                         </Button>
    //                                     </div>
    //                                 </div>
    //                             </Card>
    //                         ))}
    //                     </div>
    //                 )}
    //             </div>

    //             {/* Cart Footer */}
    //             <div className="border-t p-6 space-y-4 bg-background rounded-b-2xl">
    //                 <div className="space-y-2">
    //                     <div className="flex justify-between items-center text-sm">
    //                         <span className="text-muted-foreground">Items</span>
    //                         <span className="font-medium">
    //                             {getItemCount()}
    //                         </span>
    //                     </div>
    //                     <Separator />
    //                     <div className="flex justify-between items-center">
    //                         <span className="text-lg font-bold">Total</span>
    //                         <span className="text-2xl font-bold text-primary">
    //                             {formatRupiah(calculateTotal())}
    //                         </span>
    //                     </div>
    //                 </div>
    //                 <Button
    //                     onClick={onProcessOrder}
    //                     disabled={
    //                         processing || !selectedStore || cart.length === 0
    //                     }
    //                     className="w-full h-12 text-base font-semibold"
    //                     size="lg"
    //                 >
    //                     {processing ? "Processing..." : "Confirm Order"}
    //                 </Button>
    //             </div>
    //         </div>
    //     </div>
    // );

    return (
        <div className="flex flex-col mt-8">
            <div className="w-80 mx-auto bg-background border rounded-lg shadow-sm flex flex-col flex-1 overflow-hidden">
                {/* Cart Header */}
                <div className="p-4 py-3 flex items-center justify-between rounded-t-2xl bg-muted/20 border-b">
                    <div className="flex items-center gap-2">
                        {/* <ShoppingCart className="h-5 w-5" /> */}
                        <h2 className="text-lg font-semibold">Your Cart</h2>
                    </div>
                    {cart.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearCart}
                            className="text-destructive"
                        >
                            Clear All
                        </Button>
                    )}
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
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div
                                    key={item.productId}
                                    className="flex items-center justify-between gap-3 border rounded-lg p-3 bg-card"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        {/* {item.image && (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-12 h-12 rounded-md object-cover border"
                                            />
                                        )} */}
                                        <div>
                                            <h4 className="font-medium text-sm line-clamp-1">
                                                {item.name}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {formatRupiah(item.price)}
                                            </p>
                                        </div>
                                    </div>

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
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            onClick={() =>
                                                onRemoveFromCart(item.productId)
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Footer */}
                <div className="p-5 border-t bg-muted/30 rounded-b-2xl space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Items</span>
                        <span className="font-medium">{getItemCount()}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-lg">Total</span>
                        <span className="font-bold text-xl text-primary">
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
