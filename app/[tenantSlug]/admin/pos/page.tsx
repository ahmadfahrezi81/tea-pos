//app/[tenantSlug]/admin/pos/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useProducts } from "@/lib/client/hooks/products/useProducts";
import { useStores } from "@/lib/client/hooks/stores/useStores";
import { Input } from "@/components/ui/input"; // ✅ add this import
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store, Search } from "lucide-react"; // ✅ add Search icon
import { ProductGrid } from "./_components/product-grid";
import { Cart } from "./_components/cart";
import {
    CreateOrderInput,
    CreateOrderResponse,
} from "@/lib/shared/schemas/orders";
import { toast } from "sonner";
import type { Product } from "@/lib/shared/schemas/products";
import { ScopeBadge } from "../_components/scope-badge";
import { cn } from "@/lib/shared/utils/cn";

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    imageUrl: string | null;
    quantity: number;
}

export default function POSPage() {
    const { data: products = [], isLoading: productsLoading } = useProducts();
    const { data: storesData, isLoading: storesLoading } = useStores();

    const stores = useMemo(() => storesData?.stores ?? [], [storesData]);

    const [selectedStore, setSelectedStore] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);

    // ✅ New state for search query
    const [searchQuery, setSearchQuery] = useState("");

    // --- Filtering logic ---
    const filteredProducts = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return products.filter(
            (p) => p.isActive && p.name.toLowerCase().includes(query),
        );
    }, [products, searchQuery]);

    // Derived product sets
    const mainProducts = filteredProducts
        .filter((p) => p.isMain)
        .sort((a, b) => a.price - b.price);

    const otherProducts = filteredProducts
        .filter((p) => !p.isMain)
        .sort((a, b) => a.price - b.price);

    const allProducts = filteredProducts.sort((a, b) => a.price - b.price);

    // Auto-select first store
    useEffect(() => {
        if (stores.length > 0 && !selectedStore) {
            setSelectedStore(stores[0].id);
        }
    }, [stores, selectedStore]);

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

    const clearCart = () => {
        setCart([]);
    };

    const processOrder = async () => {
        if (!selectedStore || cart.length === 0) {
            toast.error("Please select a store and add items to cart");
            return;
        }

        setProcessing(true);

        const payload: CreateOrderInput = {
            storeId: selectedStore,
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

    if (productsLoading || storesLoading) {
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
                {/* Scope Tagging */}
                <ScopeBadge />
                {/* Header */}
                <div className="flex items-center justify-between mb-2 shrink-0">
                    <h1 className="text-3xl font-bold">POS Menu</h1>
                    <div className="flex items-center gap-2">
                        <Store className="h-5 w-5 text-muted-foreground" />
                        <Select
                            value={selectedStore}
                            onValueChange={setSelectedStore}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select store" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs
                    defaultValue="all"
                    className="flex-1 flex flex-col overflow-hidden"
                >
                    {/* Tabs header row */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <TabsList className="shrink-0">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="main">Main</TabsTrigger>
                            <TabsTrigger value="others">Others</TabsTrigger>
                        </TabsList>

                        {/* ✅ Search box */}
                        <div className="relative w-56">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cn(
                                    "pl-8",
                                    "bg-background", // Base background
                                    "focus:outline-none",
                                    "focus:ring-0",
                                    "focus-visible:outline-none",
                                    "focus-visible:ring-0",
                                    "focus:bg-muted", // Slightly darker background for light mode
                                    "dark:focus:bg-muted/60", // Slightly lighter background in dark mode
                                )}
                            />
                        </div>
                    </div>

                    {/* Tab Content */}
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
                selectedStore={selectedStore}
            />
        </div>
    );
}
