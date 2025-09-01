//components/pos/POSSystem.tsx

"use client";
import { useState } from "react";
import { useProducts, useProfile, useStores } from "@/lib/hooks/useData";

interface Product {
    id: string;
    name: string;
    price: number;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface Store {
    id: string;
    name: string;
}

export default function POSSystem() {
    const { data: profile, isLoading: profileLoading } = useProfile();
    const { data: products, isLoading: productsLoading } = useProducts();
    const { data: storesData, isLoading: storesLoading } = useStores(
        profile?.id ?? ""
    );
    const stores = storesData?.stores ?? [];

    const [selectedStore, setSelectedStore] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [processing, setProcessing] = useState(false);
    //     const {
    //         data: { user },
    //     } = await supabase.auth.getUser();
    //     if (!user) return;

    //     // Get user profile and their stores
    //     const { data: profileData } = await supabase
    //         .from("profiles")
    //         .select("*")
    //         .eq("id", user.id)
    //         .single();
    //     setProfile(profileData);

    //     // Load products
    //     const productsResponse = await fetch("/api/products");
    //     const productsData = await productsResponse.json();
    //     setProducts(productsData.products || []);

    //     // Load stores based on user role
    //     if (profileData?.role === "manager") {
    //         // Managers can see all stores
    //         const { data: storesData } = await supabase
    //             .from("stores")
    //             .select("*")
    //             .order("name");
    //         setStores(storesData || []);
    //     } else {
    //         // Sellers only see assigned stores
    //         const { data: assignments } = await supabase
    //             .from("user_store_assignments")
    //             .select("store_id, stores(id, name)")
    //             .eq("user_id", user.id);

    //         const assignedStores =
    //             assignments?.map((a) => a.stores).filter(Boolean) || [];
    //         setStores(assignedStores);
    //     }

    //     setLoading(false);
    // };

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

    const calculateTotal = () => {
        return cart.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );
    };

    const processOrder = async () => {
        if (!selectedStore || cart.length === 0) {
            alert("Please select a store and add items to cart");
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
                alert(`Order processed! Total: Rp ${data.totalAmount}`);
                setCart([]);
            } else {
                alert("Failed to process order: " + data.error);
            }
        } catch (error) {
            alert("Error processing order");
            console.log(error);
        } finally {
            setProcessing(false);
        }
    };

    // if (loading) return <div>Loading...</div>;
    if (profileLoading || productsLoading || storesLoading)
        return <div>Loading...</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Products */}
            <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {products.map((product: Product) => (
                        <div
                            key={product.id}
                            className="bg-white p-4 rounded-lg shadow"
                        >
                            <h3 className="font-medium mb-2">{product.name}</h3>
                            <p className="text-xl font-bold text-green-600 mb-3">
                                Rp {product.price}
                            </p>
                            <button
                                onClick={() => addToCart(product)}
                                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                            >
                                Add to Cart
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart */}
            <div className="bg-white p-6 rounded-lg shadow h-fit">
                <h2 className="text-xl font-semibold mb-4">Cart</h2>

                {/* Store Selection */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Store
                    </label>
                    <select
                        value={selectedStore}
                        onChange={(e) => setSelectedStore(e.target.value)}
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
                                            updateQuantity(
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
                                            updateQuantity(
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
                            onClick={processOrder}
                            disabled={processing || !selectedStore}
                            className="w-full bg-green-500 text-white py-3 rounded text-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                        >
                            {processing ? "Processing..." : "Process Order"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
