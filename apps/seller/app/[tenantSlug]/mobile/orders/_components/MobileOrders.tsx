"use client";
import { useState, useMemo } from "react";
import useStoreOrders from "@/lib/hooks/orders/useStoreOrders";
import { Calendar, CalendarDays, Receipt } from "lucide-react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import CopyableField from "@/components/shared/CopyableField";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { useStore } from "@/lib/context/StoreContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";

import dynamic from "next/dynamic";

const MiniHourlySalesChart = dynamic(() => import("./MiniHourlySalesChart"), {
    ssr: false,
    loading: () => (
        <div className="h-43 animate-pulse bg-gray-100 rounded-xl" />
    ),
});

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

const TZ_OFFSET = Number(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? 7);

export default function MobileOrders() {
    const { selectedStoreId } = useStore();

    const [selectedDate, setSelectedDate] = useState(getTodayLocalStr);

    const { data: orders = [], isLoading: ordersLoading } = useStoreOrders(
        selectedStoreId,
        selectedDate,
    );

    const hourlySales = useMemo(() => {
        if (orders.length === 0) return [];

        const hourlyData: Record<string, number> = {};
        for (const order of orders) {
            if (!order.createdAt) continue;
            const localHour = new Date(
                new Date(order.createdAt + "Z").getTime() + TZ_OFFSET * 3_600_000,
            ).getUTCHours();
            const key = `${localHour.toString().padStart(2, "0")}:00`;
            hourlyData[key] = (hourlyData[key] ?? 0) +
                order.storeOrderItems.reduce((s, item) => s + item.quantity, 0);
        }

        const slots = Array.from({ length: 24 }, (_, h) => ({
            hour: `${h.toString().padStart(2, "0")}:00`,
            cups: hourlyData[`${h.toString().padStart(2, "0")}:00`] ?? 0,
        }));

        const first = slots.findIndex((d) => d.cups > 0);
        const last = slots.findLastIndex((d) => d.cups > 0);
        return first === -1 ? [] : slots.slice(Math.max(0, first - 1), Math.min(23, last + 1) + 1);
    }, [orders]);

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
                order.storeOrderItems.reduce(
                    (itemSum, item) => itemSum + item.quantity,
                    0,
                ),
            0,
        );
        return { totalOrders, totalSales, totalCups };
    }, [orders]);

    return (
        <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-white p-4 rounded-2xl">
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
                            <SkeletonValue loading={ordersLoading} className="h-7 w-8">{summaryStats.totalOrders}</SkeletonValue>
                        </p>
                        <p className="text-sm text-gray-600">Orders</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">
                            <SkeletonValue loading={ordersLoading} className="h-7 w-8">{summaryStats.totalCups}</SkeletonValue>
                        </p>
                        <p className="text-sm text-gray-600">Cups</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-xl font-bold text-green-600">
                            <SkeletonValue loading={ordersLoading} className="h-7 w-24">{formatRupiah(summaryStats.totalSales)}</SkeletonValue>
                        </p>
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 rounded-2xl">
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
                                ? getTodayLocalStr()
                                : newValue,
                        );
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>

            {ordersLoading ? (
                <div className="h-[160px] bg-white rounded-2xl animate-pulse" />
            ) : (
                <MiniHourlySalesChart
                    storeId={selectedStoreId}
                    date={selectedDate}
                    hourlySales={hourlySales}
                />
            )}

            {/* Orders List */}
            {ordersLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-3.5 animate-pulse space-y-3">
                            <div className="flex justify-between">
                                <div className="h-6 w-28 bg-gray-200 rounded-md" />
                                <div className="h-6 w-20 bg-gray-200 rounded-md" />
                            </div>
                            <div className="h-4 w-24 bg-gray-200 rounded-md" />
                        </div>
                    ))}
                </div>
            ) : ordersWithNumbers.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl text-center">
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
                            className="bg-white rounded-2xl overflow-hidden"
                        >
                            <div className="p-3.5 bg-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-lg font-bold text-gray-800">
                                                Order #{order.orderNumber}
                                            </p>
                                            {order.paymentMethod === "qris" && (
                                                <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                                                    QRIS
                                                </span>
                                            )}
                                        </div>
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
                                            {order.storeOrderItems.reduce(
                                                (sum, item) =>
                                                    sum + item.quantity,
                                                0,
                                            )}{" "}
                                            cups
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 p-3 bg-slate-100">
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-2 text-sm">
                                            Order Details
                                        </h4>
                                        <div className="text-xs text-gray-800 space-y-1">
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
                                                {order.users?.fullName}
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
                                            {order.storeOrderItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex justify-between items-center bg-white p-2.5 rounded-xl text-sm"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">
                                                            {
                                                                item.tenantProducts
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
