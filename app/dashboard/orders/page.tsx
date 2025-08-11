// app/dashboard/orders/page.tsx
"use client";

import useOrders from "@/lib/hooks/useOrders";
import { OrderItem } from "@/lib/types";

export default function OrdersPage() {
    const { data: orders = [], isLoading } = useOrders();

    // Sort by date descending (most recent first)
    const sortedOrders = [...orders].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Generate daily order numbers (highest = most recent)
    const ordersWithNumbers = sortedOrders.map((order, _, arr) => {
        const orderDate = new Date(order.created_at).toLocaleDateString();
        const sameDayOrders = arr.filter(
            (o) => new Date(o.created_at).toLocaleDateString() === orderDate
        );
        const numberForDay =
            sameDayOrders.length - sameDayOrders.indexOf(order);
        return { ...order, orderNumber: numberForDay };
    });

    if (isLoading) return <div>Loading orders...</div>;

    // return (
    //     <div>
    //         <h1 className="text-3xl font-bold mb-8">Order History</h1>

    //         {orders.length === 0 ? (
    //             <p className="text-gray-600">No orders found.</p>
    //         ) : (
    //             <div className="space-y-4">
    //                 {orders.map((order) => (
    //                     <div
    //                         key={order.id}
    //                         className="bg-white p-6 rounded-lg shadow"
    //                     >
    //                         <div className="flex justify-between items-start mb-4">
    //                             <div>
    //                                 <h3 className="text-lg font-semibold">
    //                                     Order #{order.id.slice(-8)}
    //                                 </h3>
    //                                 <p className="text-gray-600">
    //                                     Store: {order.stores?.name}
    //                                 </p>
    //                                 <p className="text-gray-600">
    //                                     Seller: {order.profiles?.full_name}
    //                                 </p>
    //                                 <p className="text-gray-600">
    //                                     Date:{" "}
    //                                     {new Date(
    //                                         order.created_at
    //                                     ).toLocaleDateString()}
    //                                 </p>
    //                             </div>
    //                             <div className="text-right">
    //                                 <p className="text-2xl font-bold">
    //                                     ${order.total_amount.toFixed(2)}
    //                                 </p>
    //                             </div>
    //                         </div>

    //                         <div className="border-t pt-4">
    //                             <h4 className="font-semibold mb-2">Items:</h4>
    //                             <div className="space-y-1">
    //                                 {order.order_items.map(
    //                                     (item: OrderItem) => (
    //                                         <div
    //                                             key={item.id}
    //                                             className="flex justify-between text-sm"
    //                                         >
    //                                             <span>
    //                                                 {/* {item.products?.name} x */}
    //                                                 {
    //                                                     (
    //                                                         item as OrderItem & {
    //                                                             products?: {
    //                                                                 name: string;
    //                                                             };
    //                                                         }
    //                                                     ).products?.name
    //                                                 }
    //                                                 {" x "}
    //                                                 {item.quantity}
    //                                             </span>
    //                                             <span>
    //                                                 $
    //                                                 {item.total_price.toFixed(
    //                                                     2
    //                                                 )}
    //                                             </span>
    //                                         </div>
    //                                     )
    //                                 )}
    //                             </div>
    //                         </div>
    //                     </div>
    //                 ))}
    //             </div>
    //         )}
    //     </div>
    // );
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Order History</h1>

            {ordersWithNumbers.length === 0 ? (
                <p className="text-gray-600">No orders found.</p>
            ) : (
                <div className="space-y-4">
                    {ordersWithNumbers.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white p-6 rounded-lg shadow"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Order #{order.orderNumber}
                                    </h3>
                                    <p className="text-gray-600">
                                        Order id: {order.id}
                                    </p>
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
                                        ).toLocaleDateString()}{" "}
                                        {new Date(
                                            order.created_at
                                        ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
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
                                                    {
                                                        (
                                                            item as OrderItem & {
                                                                products?: {
                                                                    name: string;
                                                                };
                                                            }
                                                        ).products?.name
                                                    }
                                                    {" x "}
                                                    {item.quantity}
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
