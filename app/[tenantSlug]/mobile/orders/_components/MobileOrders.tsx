"use client";
import { useState, useMemo } from "react";
import useStoreOrders from "@/lib/hooks/orders/useStoreOrders";
import { Calendar, CalendarDays, Receipt, BarChart4 } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import CopyableField from "@/components/mobile/shared/CopyableField";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";
import { useStore } from "@/lib/context/StoreContext";
import MiniHourlySalesChart from "./MiniHourlySalesChart";

const formatMobileDate = (dateString: string) => {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
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

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

export default function MobileOrders() {
    const { selectedStoreId } = useStore();
    const router = useRouter();
    const { url } = useTenantSlug();

    const [selectedDate, setSelectedDate] = useState(
        formatDateForInput(new Date()),
    );

    const { data: orders = [], isLoading: ordersLoading } = useStoreOrders(
        selectedStoreId,
        selectedDate,
    );

    const ordersWithNumbers = useMemo(
        () =>
            orders.map((order, index) => ({
                ...order,
                orderNumber: orders.length - index,
            })),
        [orders],
    );

    const summaryStats = useMemo(() => {
        const totalOrders = orders.length;
        const totalSales = orders.reduce(
            (sum, order) => sum + order.totalAmount,
            0,
        );
        const totalCups = orders.reduce(
            (sum, order) =>
                sum +
                order.orderItems.reduce(
                    (itemSum, item) => itemSum + item.quantity,
                    0,
                ),
            0,
        );
        return { totalOrders, totalSales, totalCups };
    }, [orders]);

    if (ordersLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">Loading Orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Receipt size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">
                            Daily Summary
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">
                            {summaryStats.totalOrders}
                        </p>
                        <p className="text-sm text-gray-600">Orders</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">
                            {summaryStats.totalCups}
                        </p>
                        <p className="text-sm text-gray-600">Cups</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-xl font-bold text-green-600">
                            {formatRupiah(summaryStats.totalSales)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    Select Date
                </label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setSelectedDate(
                            newValue === ""
                                ? new Date().toISOString().split("T")[0]
                                : newValue,
                        );
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>

            <MiniHourlySalesChart
                storeId={selectedStoreId}
                date={selectedDate}
            />

            {/* Orders List */}
            {ordersWithNumbers.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                    <Calendar
                        size={48}
                        className="mx-auto text-gray-400 mb-4"
                    />
                    <p className="text-gray-600">No orders found</p>
                    <p className="text-sm text-gray-500 mt-1">
                        No orders for the selected date and store
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {formatMobileDate(selectedDate)}
                        </h3>
                        <span className="text-sm text-gray-500">
                            {ordersWithNumbers.length} order
                            {ordersWithNumbers.length > 1 ? "s" : ""}
                        </span>
                    </div>

                    {ordersWithNumbers.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-lg shadow-sm overflow-hidden"
                        >
                            <div className="p-3.5 bg-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <p className="text-lg font-bold text-gray-800">
                                            Order #{order.orderNumber}
                                        </p>
                                        <span className="text-sm text-gray-500">
                                            {formatFullTimestamp(
                                                order.createdAt ?? "",
                                            )}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                            {formatRupiah(order.totalAmount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {order.orderItems.reduce(
                                                (sum, item) =>
                                                    sum + item.quantity,
                                                0,
                                            )}{" "}
                                            cups
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 p-3 bg-gray-50">
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-2 text-sm">
                                            Order Details
                                        </h4>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div>
                                                <span className="font-medium">
                                                    Order ID:
                                                </span>
                                                <br />
                                                <div className="flex justify-between items-start">
                                                    {order.id}
                                                    <CopyableField
                                                        label="Order ID"
                                                        value={order.id}
                                                    />
                                                </div>
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
                                                {order.profiles?.fullName}
                                            </p>
                                            <p>
                                                <span className="font-medium">
                                                    Full Timestamp:
                                                </span>{" "}
                                                {new Date(
                                                    order.createdAt + "Z",
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-1 text-sm">
                                            Items
                                        </h4>
                                        <div className="space-y-2">
                                            {order.orderItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex justify-between items-center bg-white p-2.5 rounded-md text-sm"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">
                                                            {
                                                                item.products
                                                                    ?.name
                                                            }
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {formatRupiah(
                                                                item.unitPrice,
                                                            )}{" "}
                                                            each
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">
                                                            x{item.quantity}
                                                        </p>
                                                        <p className="text-xs text-gray-600">
                                                            {formatRupiah(
                                                                item.totalPrice,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
