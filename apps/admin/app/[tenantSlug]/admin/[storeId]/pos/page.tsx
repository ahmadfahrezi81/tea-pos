"use client";

import { useState, useMemo } from "react";
import { useProducts } from "@/lib/client/hooks/products/useProducts";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { ProductGrid } from "../../pos/_components/product-grid";
import { Cart } from "../../pos/_components/cart";
import {
    CreateOrderInput,
    CreateOrderResponse,
} from "@/lib/shared/schemas/orders";
import { toast } from "sonner";
import type { Product } from "@/lib/shared/schemas/products";
import { ScopeBadge } from "../../_components/scope-badge";
import { useStoreScope } from "../../StoreScopeProvider"; // ✅ get store context

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    imageUrl: string | null;
    quantity: number;
}

export default function StorePosPage() {
    const { storeId, storeName } = useStoreScope();
    const { data: products = [], isLoading: productsLoading } = useProducts();

    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Filtering logic ---
    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return products.filter(
            (p) => p.isActive && p.name.toLowerCase().includes(query),
        );
    }, [products, searchQuery]);

    const mainProducts = filteredProducts
        .filter((p) => p.isMain)
        .sort((a, b) => a.price - b.price);

    const otherProducts = filteredProducts
        .filter((p) => !p.isMain)
        .sort((a, b) => a.price - b.price);

    const allProducts = filteredProducts.sort((a, b) => a.price - b.price);

    // --- Cart functions ---
    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.productId === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }
            return [
                ...prev,
                {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: 1,
                },
            ];
        });
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) =>
                prev.filter((item) => item.productId !== productId),
            );
        } else {
            setCart((prev) =>
                prev.map((item) =>
                    item.productId === productId ? { ...item, quantity } : item,
                ),
            );
        }
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const processOrder = async () => {
        if (!storeId || cart.length === 0) {
            toast.error("Missing store or no items in cart");
            return;
        }

        setProcessing(true);

        const payload: CreateOrderInput = {
            storeId,
            items: cart.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.price,
            })),
        };

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data: CreateOrderResponse = await response.json();

            if (data.success) {
                const formatRupiah = (amount: number) =>
                    new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                    }).format(amount);

                toast.success(
                    `Order processed! Total: ${formatRupiah(data.totalAmount)}`,
                );
                setCart([]);
            } else {
                toast.error("Failed to process order");
            }
        } catch (error) {
            toast.error("Error processing order");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    if (productsLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">Loading POS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px-16px)]">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col p-8 pb-0 pt-6 overflow-hidden">
                <ScopeBadge />

                {/* Header */}
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <h1 className="text-3xl font-bold">
                        POS Menu {storeName && `– ${storeName}`}
                    </h1>
                </div>

                {/* Tabs + Search */}
                <Tabs
                    defaultValue="all"
                    className="flex-1 flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <TabsList className="shrink-0">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="main">Main</TabsTrigger>
                            <TabsTrigger value="others">Others</TabsTrigger>
                        </TabsList>

                        {/* Search bar */}
                        <div className="relative w-56">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:outline-none"
                            />
                        </div>
                    </div>

                    <TabsContent value="all" className="flex-1 overflow-y-auto">
                        <ProductGrid
                            products={allProducts}
                            onAddToCart={addToCart}
                            cart={cart}
                        />
                    </TabsContent>

                    <TabsContent
                        value="main"
                        className="flex-1 overflow-y-auto"
                    >
                        <ProductGrid
                            products={mainProducts}
                            onAddToCart={addToCart}
                            cart={cart}
                        />
                    </TabsContent>

                    <TabsContent
                        value="others"
                        className="flex-1 overflow-y-auto"
                    >
                        <ProductGrid
                            products={otherProducts}
                            onAddToCart={addToCart}
                            cart={cart}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Cart Sidebar */}
            <Cart
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onClearCart={clearCart}
                onProcessOrder={processOrder}
                processing={processing}
                selectedStore={storeId ?? ""}
            />
        </div>
    );
}
