// app/[tenantSlug]/admin/pos/_components/product-grid.tsx
import Image from "next/image";
import { Card } from "@/components/ui/card";
import type { Product } from "@/lib/schemas/products";
import type { CartItem } from "../page";

interface ProductGridProps {
    products: Product[];
    onAddToCart: (product: Product) => void;
    cart: CartItem[];
}

export function ProductGrid({ products, onAddToCart, cart }: ProductGridProps) {
    const getProductQuantityInCart = (productId: string) => {
        const item = cart.find((item) => item.productId === productId);
        return item ? item.quantity : 0;
    };

    const formatRupiah = (amount: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (products.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No products available in this category</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-20 pr-2">
            {products.map((product) => {
                const quantityInCart = getProductQuantityInCart(product.id);
                return (
                    <Card
                        key={product.id}
                        onClick={() => onAddToCart(product)}
                        className="cursor-pointer relative overflow-hidden p-3 space-y-1 rounded-lg"
                    >
                        {quantityInCart > 0 && (
                            <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold shadow">
                                {quantityInCart}
                            </div>
                        )}
                        <div className="space-y-1">
                            {product.imageUrl ? (
                                <div className="relative w-full aspect-square mb-1 rounded-md overflow-hidden bg-muted">
                                    <Image
                                        src={product.imageUrl}
                                        alt={product.name}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="relative w-full aspect-square mb-2 rounded-md bg-muted flex items-center justify-center">
                                    <span className="text-3xl">📦</span>
                                </div>
                            )}
                            <div className="flex flex-col gap-0 items-start">
                                <h3 className="font-bold text-left leading-tight">
                                    {product.name}
                                </h3>
                                <p className="text-primary font-medium text-base text-left leading-tight">
                                    {formatRupiah(product.price)}
                                </p>
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
