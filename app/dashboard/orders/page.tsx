// app/dashboard/orders/page.tsx
"use client";
// import { useEffect, useState } from "react";
// import { createClient } from "@/lib/supabase/client";
import useOrders from "@/lib/hooks/useOrders";
import { OrderItem } from "@/lib/types";

export default function OrdersPage() {
    // const [orders, setOrders] = useState<any[]>([]);
    // const [loading, setLoading] = useState(true);
    // const [userStores, setUserStores] = useState<string[]>([]);
    // const [profile, setProfile] = useState<any>(null);
    // const supabase = createClient();
    const { data: orders = [], isLoading } = useOrders();

    // useEffect(() => {
    //     loadData();
    // }, []);

    // const loadData = async () => {
    //     const {
    //         data: { user },
    //     } = await supabase.auth.getUser();
    //     if (!user) return;

    //     // Get user profile
    //     const { data: profileData } = await supabase
    //         .from("profiles")
    //         .select("*")
    //         .eq("id", user.id)
    //         .single();
    //     setProfile(profileData);

    //     if (profileData?.role === "seller") {
    //         // Get seller's assigned stores
    //         const { data: assignments } = await supabase
    //             .from("user_store_assignments")
    //             .select("store_id")
    //             .eq("user_id", user.id);

    //         const storeIds = assignments?.map((a) => a.store_id) || [];
    //         setUserStores(storeIds);

    //         // Load orders from assigned stores only
    //         if (storeIds.length > 0) {
    //             const { data } = await supabase
    //                 .from("orders")
    //                 .select(
    //                     `
    //         *,
    //         stores(name),
    //         profiles(full_name),
    //         order_items(
    //           *,
    //           products(name)
    //         )
    //       `
    //                 )
    //                 .in("store_id", storeIds)
    //                 .order("created_at", { ascending: false });
    //             setOrders(data || []);
    //         }
    //     } else {
    //         // Manager can see all orders
    //         const { data } = await supabase
    //             .from("orders")
    //             .select(
    //                 `
    //       *,
    //       stores(name),
    //       profiles(full_name),
    //       order_items(
    //         *,
    //         products(name)
    //       )
    //     `
    //             )
    //             .order("created_at", { ascending: false });
    //         setOrders(data || []);
    //     }

    //     setLoading(false);
    // };

    // if (loading) return <div>Loading orders...</div>;

    if (isLoading) return <div>Loading orders...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Order History</h1>

            {orders.length === 0 ? (
                <p className="text-gray-600">No orders found.</p>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white p-6 rounded-lg shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Order #{order.id.slice(-8)}
                                    </h3>
                                    <p className="text-gray-600">
                                        Store: {order.stores?.name}
                                    </p>
                                    <p className="text-gray-600">
                                        Seller: {order.profiles?.full_name}
                                    </p>
                                    <p className="text-gray-600">
                                        Date:{" "}
                                        {new Date(
                                            order.created_at
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold">
                                        ${order.total_amount.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h4 className="font-semibold mb-2">Items:</h4>
                                <div className="space-y-1">
                                    {order.order_items.map(
                                        (item: OrderItem) => (
                                            <div
                                                key={item.id}
                                                className="flex justify-between text-sm"
                                            >
                                                <span>
                                                    {/* {item.products?.name} x */}
                                                    {
                                                        (
                                                            item as OrderItem & {
                                                                products?: {
                                                                    name: string;
                                                                };
                                                            }
                                                        ).products?.name
                                                    }
                                                    x{item.quantity}
                                                </span>
                                                <span>
                                                    $
                                                    {item.total_price.toFixed(
                                                        2
                                                    )}
                                                </span>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
