//components/mobile/MobileOrders.tsx
"use client";
import { useState, useMemo, useEffect } from "react";
import useOrders from "@/lib/hooks/useOrders";
import { useStores } from "@/lib/hooks/useData";
import { Store } from "@/lib/types";
import { Calendar, CalendarDays, StoreIcon, Receipt } from "lucide-react";
import { formatRupiah } from "@/lib/utils/formatCurrency";
import CopyableField from "./ui/CopyableField";
import { useAuth } from "@/lib/context/AuthContext";
import { Tables } from "@/lib/db.types";

// Mobile-optimized date formatting
const formatMobileDate = (dateString: string) => {
    const date = new Date(dateString + "Z");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year:
                date.getFullYear() !== today.getFullYear()
                    ? "numeric"
                    : undefined,
        });
    }
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

const formatDateForInput = (date: Date) => {
    return date.toISOString().split("T")[0];
};

export type Assignment = Tables<"user_store_assignments">;

export default function MobileOrders() {
    const { profile } = useAuth();
    const { data: orders = [], isLoading } = useOrders();
    const { data: storesData, isLoading: storesLoading } = useStores();
    const stores = storesData?.stores ?? [];
    const assignments = storesData?.assignments ?? {};

    const defaultStore = stores.find((store: Store) =>
        assignments[store.id]?.some(
            (assignment: Assignment) =>
                assignment.user_id === profile?.id && assignment.is_default
        )
    );

    // Initialize with current date and first store
    const [selectedDate, setSelectedDate] = useState(
        formatDateForInput(new Date())
    );
    const [selectedStore, setSelectedStore] = useState<string>("");

    // Auto-select first store when stores load
    useEffect(() => {
        if (defaultStore && !selectedStore) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, storesData]);

    // Filter orders based on selected date and store
    const filteredOrders = useMemo(() => {
        let filtered = [...orders];

        // Filter by selected date
        if (selectedDate) {
            const targetDate = new Date(selectedDate);
            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.created_at + "Z");
                return orderDate.toDateString() === targetDate.toDateString();
            });
        }

        // Filter by selected store
        if (selectedStore) {
            filtered = filtered.filter(
                (order) => order.store_id === selectedStore
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at + "Z").getTime();
            const dateB = new Date(b.created_at + "Z").getTime();
            return dateB - dateA;
        });

        return filtered;
    }, [orders, selectedDate, selectedStore]);

    // Add order numbers for the filtered orders
    const ordersWithNumbers = useMemo(() => {
        return filteredOrders.map((order, index) => ({
            ...order,
            orderNumber: filteredOrders.length - index,
        }));
    }, [filteredOrders]);

    // Calculate summary statistics
    const summaryStats = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalSales = filteredOrders.reduce(
            (sum, order) => sum + order.total_amount,
            0
        );
        const totalCups = filteredOrders.reduce((sum, order) => {
            return (
                sum +
                order.order_items.reduce(
                    (itemSum: number, item: { quantity: number }) =>
                        itemSum + item.quantity,
                    0
                )
            );
        }, 0);

        return { totalOrders, totalSales, totalCups };
    }, [filteredOrders]);

    if (isLoading || storesLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 text-sm">Loading Orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Summary Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Receipt size={20} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-800">
                        Daily Summary
                    </h3>
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

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="grid grid-cols-1 gap-3">
                    {/* Date Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <CalendarDays size={16} className="inline mr-1" />
                            Select Date
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Store Filter */}
                    {stores.length > 1 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <StoreIcon size={16} className="inline mr-1" />
                                Select Store
                            </label>
                            <select
                                value={selectedStore}
                                onChange={(e) =>
                                    setSelectedStore(e.target.value)
                                }
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                {/* <option value="">All Stores</option> */}
                                {stores.map((store: Store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

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
                    {/* Date Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {formatMobileDate(selectedDate + "T00:00:00")}
                        </h3>
                        <span className="text-sm text-gray-500">
                            {ordersWithNumbers.length} order
                            {ordersWithNumbers.length > 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Always Expanded Orders */}
                    {ordersWithNumbers.map((order) => (
                        <div
                            key={order.id}
                            className="bg-white rounded-lg shadow-sm overflow-hidden"
                        >
                            {/* Order Header - White Background */}
                            <div className="p-3.5 bg-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1">
                                            {/* <HandPlatter size={16} /> */}
                                            <p className="text-lg font-bold text-gray-800">
                                                Order #{order.orderNumber}
                                            </p>
                                        </div>

                                        {/* <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg font-bold text-gray-800">
                                                Order #{order.orderNumber}
                                            </span>
                                        </div> */}
                                        {/* <div className="text-sm text-gray-600">
                                            {order.stores?.name}
                                        </div> */}
                                        {/* <div className="text-sm text-gray-500">
                                            {order.profiles?.full_name}
                                        </div> */}
                                        <span className="text-sm text-gray-500">
                                            {formatFullTimestamp(
                                                order.created_at ?? ""
                                            )}
                                        </span>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-lg font-bold text-green-600">
                                            {formatRupiah(order.total_amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {order.order_items.reduce(
                                                (
                                                    sum: number,
                                                    item: { quantity: number }
                                                ) => sum + item.quantity,
                                                0
                                            )}{" "}
                                            cups
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Items Summary */}
                                {/* <div className="flex flex-wrap gap-1 mt-2">
                                    {order.order_items.map(
                                        (item: OrderItem, index: number) => (
                                            <span
                                                key={item.id}
                                                className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium"
                                            >
                                                {
                                                    (
                                                        item as OrderItem & {
                                                            products?: {
                                                                name: string;
                                                            };
                                                        }
                                                    ).products?.name
                                                }{" "}
                                                x{item.quantity}
                                            </span>
                                        )
                                    )}
                                </div> */}
                            </div>

                            {/* Order Details - Gray Background */}
                            <div className="border-t border-gray-100 p-3 bg-gray-50">
                                <div className="space-y-3">
                                    {/* Order Info */}
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
                                        <h4 className="font-medium text-gray-800 mb-1 text-sm">
                                            Items
                                        </h4>
                                        <div className="space-y-2">
                                            {order.order_items.map((item) => (
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
                                                                item.unit_price
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
                                                                item.total_price
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
