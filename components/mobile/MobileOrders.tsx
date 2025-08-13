"use client";
import { useState, useMemo } from "react";
import useOrders from "@/lib/hooks/useOrders";
import { Profile, OrderItem } from "@/lib/types";
import { Calendar, Search, ChevronDown, ChevronUp } from "lucide-react";

interface MobileOrdersProps {
    profile: Profile | null;
}

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

const formatTime = (dateString: string) => {
    const date = new Date(dateString + "Z");
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MobileOrders({ profile }: MobileOrdersProps) {
    const { data: orders = [], isLoading } = useOrders();
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">(
        "all"
    );
    // Add this state at the top with other useState declarations:
    const [showSummary, setShowSummary] = useState(false);

    // Filter and process orders for mobile
    const processedOrders = useMemo(() => {
        let filtered = [...orders];

        // Apply search filter
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

        // Apply date filter
        const now = new Date();
        if (dateFilter === "today") {
            const today = now.toDateString();
            filtered = filtered.filter((order) => {
                const orderDate = new Date(
                    order.created_at + "Z"
                ).toDateString();
                return orderDate === today;
            });
        } else if (dateFilter === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter((order) => {
                const orderDate = new Date(order.created_at + "Z");
                return orderDate >= weekAgo;
            });
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.created_at + "Z").getTime();
            const dateB = new Date(b.created_at + "Z").getTime();
            return dateB - dateA;
        });

        return filtered;
    }, [orders, searchTerm, dateFilter]);

    // Add this before groupedOrders useMemo
    const ordersWithNumbers = useMemo(() => {
        return processedOrders.map((order, _, arr) => {
            const orderDate = formatMobileDate(order.created_at);
            const sameDayOrders = arr.filter(
                (o) => formatMobileDate(o.created_at) === orderDate
            );
            const numberForDay =
                sameDayOrders.length - sameDayOrders.indexOf(order);
            return { ...order, orderNumber: numberForDay };
        });
    }, [processedOrders]);

    // Update the groupedOrders useMemo to use ordersWithNumbers instead of processedOrders:
    const groupedOrders = useMemo(() => {
        const groups: { [key: string]: typeof ordersWithNumbers } = {};

        ordersWithNumbers.forEach((order) => {
            const dateKey = formatMobileDate(order.created_at);
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(order);
        });

        return Object.entries(groups).sort(([dateA], [dateB]) => {
            if (dateA === "Today") return -1;
            if (dateB === "Today") return 1;
            if (dateA === "Yesterday") return -1;
            if (dateB === "Yesterday") return 1;
            return dateA.localeCompare(dateB);
        });
    }, [ordersWithNumbers]);

    // Group orders by date for mobile display
    // const groupedOrders = useMemo(() => {
    //     const groups: { [key: string]: typeof processedOrders } = {};

    //     processedOrders.forEach((order) => {
    //         const dateKey = formatMobileDate(order.created_at);
    //         if (!groups[dateKey]) {
    //             groups[dateKey] = [];
    //         }
    //         groups[dateKey].push(order);
    //     });

    //     return Object.entries(groups).sort(([dateA], [dateB]) => {
    //         // Custom sort to ensure Today comes first, then Yesterday, etc.
    //         if (dateA === "Today") return -1;
    //         if (dateB === "Today") return 1;
    //         if (dateA === "Yesterday") return -1;
    //         if (dateB === "Yesterday") return 1;
    //         return dateA.localeCompare(dateB);
    //     });
    // }, [processedOrders]);

    // Add this helper function after the existing formatTime function:
    const formatFullDate = (dateString: string) => {
        const date = new Date(dateString + "Z");
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading orders...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toggleable Summary - Move to TOP */}
            {processedOrders.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowSummary(!showSummary)}
                        className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
                    >
                        <h3 className="font-semibold text-gray-800">Summary</h3>
                        {showSummary ? (
                            <ChevronUp size={20} className="text-gray-400" />
                        ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                        )}
                    </button>

                    {showSummary && (
                        <div className="border-t border-gray-100 p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {processedOrders.length}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Orders
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">
                                        $
                                        {processedOrders
                                            .reduce(
                                                (sum, order) =>
                                                    sum + order.total_amount,
                                                0
                                            )
                                            .toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Total Sales
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                    <div className="flex-1 relative">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex space-x-2">
                    {[
                        { key: "all", label: "All" },
                        { key: "today", label: "Today" },
                        { key: "week", label: "This Week" },
                    ].map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() =>
                                setDateFilter(
                                    filter.key as "all" | "today" | "week"
                                )
                            }
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                                dateFilter === filter.key
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            {groupedOrders.length === 0 ? (
                <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                    <Calendar
                        size={48}
                        className="mx-auto text-gray-400 mb-4"
                    />
                    <p className="text-gray-600">No orders found</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {searchTerm
                            ? "Try adjusting your search"
                            : "Orders will appear here once created"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {groupedOrders.map(([date, dayOrders]) => (
                        <div key={date} className="space-y-3">
                            {/* Date Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {date}
                                </h3>
                                <span className="text-sm text-gray-500">
                                    {dayOrders.length} order
                                    {dayOrders.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Orders for this date */}
                            {dayOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-white rounded-lg shadow-sm overflow-hidden"
                                >
                                    <div
                                        className="p-4 cursor-pointer"
                                        onClick={() =>
                                            setExpandedOrder(
                                                expandedOrder === order.id
                                                    ? null
                                                    : order.id
                                            )
                                        }
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        Order #
                                                        {order.orderNumber} •{" "}
                                                        {formatTime(
                                                            order.created_at
                                                        )}
                                                    </span>
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                    <span className="text-sm text-gray-600">
                                                        {order.stores?.name}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {order.profiles?.full_name}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center space-x-2">
                                                <div>
                                                    <p className="text-lg font-bold text-green-600">
                                                        $
                                                        {order.total_amount.toFixed(
                                                            2
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {order.order_items.reduce(
                                                            (
                                                                sum: number,
                                                                item: {
                                                                    quantity: number;
                                                                }
                                                            ) =>
                                                                sum +
                                                                item.quantity,
                                                            0
                                                        )}{" "}
                                                        items
                                                    </p>
                                                </div>
                                                {expandedOrder === order.id ? (
                                                    <ChevronUp
                                                        size={20}
                                                        className="text-gray-400"
                                                    />
                                                ) : (
                                                    <ChevronDown
                                                        size={20}
                                                        className="text-gray-400"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Quick preview of items (when collapsed) */}
                                        {expandedOrder !== order.id && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {order.order_items
                                                    .slice(0, 3)
                                                    .map((item: OrderItem) => (
                                                        <span
                                                            key={item.id}
                                                            className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
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
                                                    ))}
                                                {order.order_items.length >
                                                    3 && (
                                                    <span className="text-xs text-gray-500">
                                                        +
                                                        {order.order_items
                                                            .length - 3}{" "}
                                                        more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedOrder === order.id && (
                                        <div className="border-t border-gray-100 p-4 bg-gray-50">
                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="font-medium text-gray-800 mb-2">
                                                        Order Details
                                                    </h4>
                                                    <div className="text-sm text-gray-600 space-y-1">
                                                        <p>
                                                            <span className="font-medium">
                                                                Order ID:
                                                            </span>{" "}
                                                            {order.id}
                                                        </p>
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
                                                            {
                                                                order.profiles
                                                                    ?.full_name
                                                            }
                                                        </p>
                                                        <p>
                                                            <span className="font-medium">
                                                                Date:
                                                            </span>{" "}
                                                            {formatFullDate(
                                                                order.created_at
                                                            )}
                                                        </p>
                                                        <p>
                                                            <span className="font-medium">
                                                                Time:
                                                            </span>{" "}
                                                            {formatTime(
                                                                order.created_at
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-medium text-gray-800 mb-2">
                                                        Items
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {order.order_items.map(
                                                            (
                                                                item: OrderItem
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="flex justify-between items-center bg-white p-3 rounded"
                                                                >
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">
                                                                            {
                                                                                (
                                                                                    item as OrderItem & {
                                                                                        products?: {
                                                                                            name: string;
                                                                                        };
                                                                                    }
                                                                                )
                                                                                    .products
                                                                                    ?.name
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            $
                                                                            {item.unit_price.toFixed(
                                                                                2
                                                                            )}{" "}
                                                                            each
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="font-medium text-sm">
                                                                            x
                                                                            {
                                                                                item.quantity
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-gray-600">
                                                                            $
                                                                            {item.total_price.toFixed(
                                                                                2
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200 pt-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-semibold text-gray-800">
                                                            Total
                                                        </span>
                                                        <span className="font-bold text-lg text-green-600">
                                                            $
                                                            {order.total_amount.toFixed(
                                                                2
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Stats */}
            {/* {processedOrders.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h3 className="font-semibold text-gray-800 mb-3">
                        Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {processedOrders.length}
                            </p>
                            <p className="text-sm text-gray-600">Orders</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                $
                                {processedOrders
                                    .reduce(
                                        (sum, order) =>
                                            sum + order.total_amount,
                                        0
                                    )
                                    .toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">Total Sales</p>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    );
}
