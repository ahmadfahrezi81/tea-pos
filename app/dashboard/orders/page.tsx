// app/dashboard/orders/page.tsx
"use client";

import { useState, useMemo } from "react";
import useOrders from "@/lib/hooks/useOrders";
import { OrderItem } from "@/lib/types";
import { toIndonesiaDate, toIndonesiaTime } from "@/lib/timezone";
// import { toIndonesiaTime, toIndonesiaDate } from "@/lib/utils/timezone";

export default function OrdersPage() {
    const { data: orders = [], isLoading } = useOrders();

    // Filter and sorting states
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortBy, setSortBy] = useState<"date" | "amount">("date");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    // Process and filter orders
    const processedOrders = useMemo(() => {
        let filtered = [...orders];

        // Apply search filter (store name, seller name, product names)
        if (searchTerm) {
            filtered = filtered.filter(
                (order) =>
                    order.stores?.name
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    order.profiles?.full_name
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    order.order_items.some((item: OrderItem) =>
                        (
                            item as OrderItem & { products?: { name: string } }
                        ).products?.name
                            ?.toLowerCase()
                            .includes(searchTerm.toLowerCase())
                    )
            );
        }

        // Apply date filters
        if (dateFrom) {
            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.created_at + "Z");
                const fromDate = new Date(dateFrom);
                return orderDate >= fromDate;
            });
        }

        if (dateTo) {
            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.created_at + "Z");
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999); // End of day
                return orderDate <= toDate;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            if (sortBy === "date") {
                const dateA = new Date(a.created_at + "Z").getTime();
                const dateB = new Date(b.created_at + "Z").getTime();
                return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
            } else {
                return sortOrder === "desc"
                    ? b.total_amount - a.total_amount
                    : a.total_amount - b.total_amount;
            }
        });

        // Generate daily order numbers
        const ordersWithNumbers = filtered.map((order, _, arr) => {
            const orderDate = toIndonesiaDate(order.created_at);
            const sameDayOrders = arr.filter(
                (o) => toIndonesiaDate(o.created_at) === orderDate
            );
            const numberForDay =
                sameDayOrders.length - sameDayOrders.indexOf(order);
            return { ...order, orderNumber: numberForDay };
        });

        return ordersWithNumbers;
    }, [orders, searchTerm, dateFrom, dateTo, sortBy, sortOrder]);

    // Group orders by date
    const groupedOrders = useMemo(() => {
        const groups: { [key: string]: typeof processedOrders } = {};

        processedOrders.forEach((order) => {
            const dateKey = toIndonesiaDate(order.created_at);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(order);
        });

        return Object.entries(groups).sort(([dateA], [dateB]) => {
            const a = new Date(dateA.split("/").reverse().join("-")).getTime();
            const b = new Date(dateB.split("/").reverse().join("-")).getTime();
            return sortOrder === "desc" ? b - a : a - b;
        });
    }, [processedOrders, sortOrder]);

    // Format date with day name
    const formatDateHeader = (dateStr: string) => {
        const [day, month, year] = dateStr.split("/");
        const date = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day)
        );
        return date.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (isLoading) return <div>Loading orders...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Order History</h1>

            {/* Filters and Controls */}
            <div className="bg-white p-6 rounded-lg shadow mb-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Store, seller, or product..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Date From */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    </div>

                    {/* Sort */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sort By
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) =>
                                    setSortBy(
                                        e.target.value as "date" | "amount"
                                    )
                                }
                                className="flex-1 p-2 border border-gray-300 rounded-md"
                            >
                                <option value="date">Date</option>
                                <option value="amount">Amount</option>
                            </select>
                            <select
                                value={sortOrder}
                                onChange={(e) =>
                                    setSortOrder(
                                        e.target.value as "asc" | "desc"
                                    )
                                }
                                className="p-2 border border-gray-300 rounded-md"
                            >
                                <option value="desc">↓</option>
                                <option value="asc">↑</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Clear Filters */}
                <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-gray-600">
                        {processedOrders.length} order(s) found
                    </span>
                    <button
                        onClick={() => {
                            setSearchTerm("");
                            setDateFrom("");
                            setDateTo("");
                            setSortBy("date");
                            setSortOrder("desc");
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Clear all filters
                    </button>
                </div>
            </div>

            {/* Orders */}
            {groupedOrders.length === 0 ? (
                <p className="text-gray-600">
                    No orders found matching your filters.
                </p>
            ) : (
                <div className="space-y-8">
                    {groupedOrders.map(([date, dayOrders]) => (
                        <div key={date}>
                            {/* Date Header */}
                            <div className="flex items-center mb-4">
                                <h3 className="text-xl font-semibold text-gray-800">
                                    {formatDateHeader(date)}
                                </h3>
                                <div className="flex-1 h-px bg-gray-300 ml-4"></div>
                                <span className="ml-4 text-sm text-gray-500">
                                    {dayOrders.length} order
                                    {dayOrders.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Orders for this date */}
                            <div className="space-y-4">
                                {dayOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="bg-white p-6 rounded-lg shadow"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold">
                                                    Order #{order.orderNumber}
                                                </h4>
                                                <p className="text-gray-600 text-sm">
                                                    Order id: {order.id}
                                                </p>
                                                <p className="text-gray-600">
                                                    Store: {order.stores?.name}
                                                </p>
                                                <p className="text-gray-600">
                                                    Seller:{" "}
                                                    {order.profiles?.full_name}
                                                </p>
                                                <p className="text-gray-600">
                                                    Time:{" "}
                                                    {
                                                        toIndonesiaTime(
                                                            order.created_at
                                                        ).split(" ")[1]
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">
                                                    Rp {order.total_amount}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border-t pt-4">
                                            <h5 className="font-semibold mb-2">
                                                Items:
                                            </h5>
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
                                                                    ).products
                                                                        ?.name
                                                                }
                                                                {" x "}
                                                                {item.quantity}
                                                            </span>
                                                            <span>
                                                                Rp{" "}
                                                                {
                                                                    item.total_price
                                                                }
                                                            </span>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
