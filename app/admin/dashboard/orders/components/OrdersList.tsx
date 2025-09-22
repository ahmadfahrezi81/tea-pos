// components/OrdersList.tsx
import React from "react";
import { Order, OrderItem } from "../types/orders";
import { CopyableField } from "./CopyableField";

interface OrdersListProps {
    orders: (Order & { orderNumber: number })[];
}

const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatFullTimestamp = (dateString: string) => {
    const date = new Date(dateString + "Z");
    return date.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });
};

export const OrdersList: React.FC<OrdersListProps> = ({ orders }) => {
    if (orders.length === 0) {
        return (
            <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-gray-600 mb-4">No orders found</p>
                <p className="text-sm text-gray-500">
                    No orders match your current filters
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <div
                    key={order.id}
                    className="bg-white rounded-lg shadow overflow-hidden"
                >
                    {/* Order Header */}
                    <div className="p-4 bg-white">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-lg font-bold text-gray-800">
                                        Order #{order.orderNumber}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-500 mb-2">
                                    {formatFullTimestamp(order.created_at)}
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-xl font-bold text-green-600">
                                    {formatRupiah(order.total_amount)}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {order.order_items.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    )}{" "}
                                    cups
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="space-y-4">
                            {/* Order Info */}
                            <div>
                                <h5 className="font-medium text-gray-800 mb-2 text-sm">
                                    Order Details
                                </h5>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-medium">
                                                Order ID:
                                            </span>
                                            <br />
                                            <span className="font-mono text-xs text-gray-500">
                                                {order.id}
                                            </span>
                                        </div>
                                        <CopyableField
                                            label="Order ID"
                                            value={order.id}
                                        />
                                    </div>
                                    <p>
                                        <span className="font-medium">
                                            Store:
                                        </span>{" "}
                                        {order.stores?.name}
                                    </p>
                                    <p>
                                        <span className="font-medium">
                                            Seller:
                                        </span>{" "}
                                        {order.profiles?.full_name}
                                    </p>
                                    <p>
                                        <span className="font-medium">
                                            Full Timestamp:
                                        </span>{" "}
                                        {new Date(
                                            order.created_at + "Z"
                                        ).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Items Breakdown */}
                            <div>
                                <h5 className="font-medium text-gray-800 mb-2 text-sm">
                                    Items
                                </h5>
                                <div className="space-y-2">
                                    {order.order_items.map(
                                        (item: OrderItem) => (
                                            <div
                                                key={item.id}
                                                className="flex justify-between items-center bg-white p-3 rounded-md"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {item.products?.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatRupiah(
                                                            item.unit_price
                                                        )}{" "}
                                                        each
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-sm">
                                                        x{item.quantity}
                                                    </p>
                                                    <p className="text-xs text-gray-600">
                                                        {formatRupiah(
                                                            item.total_price
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
