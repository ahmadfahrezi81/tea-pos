"use client";
import { useState, useMemo } from "react";
import useStoreOrders from "@/lib/hooks/orders/useStoreOrders";
import useHourlySales from "@/lib/hooks/analytics/useHourlySales";
import { Calendar, CalendarDays, Receipt, ChevronDown } from "lucide-react";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import CopyableField from "@/components/shared/CopyableField";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { useStore } from "@/lib/context/StoreContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { useT } from "@/lib/hooks/useT";

import dynamic from "next/dynamic";

const MiniHourlySalesChart = dynamic(() => import("./MiniHourlySalesChart"), {
    ssr: false,
    loading: () => (
        <div className="h-43 animate-pulse bg-gray-100 rounded-xl" />
    ),
});

const formatMobileDate = (dateString: string, t: (key: string) => string) => {
    const date = new Date(dateString + "T00:00:00");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t("orders.today");
    if (date.toDateString() === yesterday.toDateString()) return t("orders.yesterday");

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

export default function MobileOrders() {
    const { selectedStoreId } = useStore();
    const t = useT();

    const [selectedDate, setSelectedDate] = useState(getTodayLocalStr);

    // Two states, not a ladder of page sizes: a day rarely passes ~200 orders,
    // so "show all" is one more fetch and done.
    const [showAll, setShowAll] = useState(false);

    const { data, isLoading: ordersLoading } = useStoreOrders(
        selectedStoreId,
        selectedDate,
        showAll ? 500 : undefined,
    );

    // Memoised because `?? []` would hand `ordersWithNumbers` a fresh array
    // identity on every render, defeating its memo.
    const orders = useMemo(() => data?.orders ?? [], [data]);
    // Whole-day figures from the summary row. Reducing over `orders` would
    // under-report the moment the list is capped — the bug that sank the
    // previous attempt at this.
    const totals = data?.totals ?? { totalOrders: 0, totalSales: 0, totalCups: 0 };

    // Bucketed server-side by /api/analytics/hourly-sales, which selects only
    // created_at and item quantities. The chart used to be re-derived here from
    // the full order payload, which is exactly what the cap removes.
    const { data: hourlySales = [] } = useHourlySales(selectedStoreId, selectedDate);

    // Numbered against the day, not the loaded slice, so #N stays stable
    // whether 25 or every order is on screen. Newest is highest.
    const ordersWithNumbers = useMemo(
        () =>
            orders.map((order, index) => ({
                ...order,
                orderNumber: totals.totalOrders - index,
            })),
        [orders, totals.totalOrders],
    );

    const hasMore = totals.totalOrders > orders.length;

    return (
        <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-white p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Receipt size={20} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-800">
                            {t("orders.dailySummary")}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">
                            <SkeletonValue loading={ordersLoading} className="h-7 w-8">{totals.totalOrders}</SkeletonValue>
                        </p>
                        <p className="text-sm text-gray-600">{t("analytics.orders")}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">
                            <SkeletonValue loading={ordersLoading} className="h-7 w-8">{totals.totalCups}</SkeletonValue>
                        </p>
                        <p className="text-sm text-gray-600">{t("analytics.cups")}</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">{t("analytics.totalSales")}</p>
                        <p className="text-xl font-bold text-green-600">
                            <SkeletonValue loading={ordersLoading} className="h-7 w-24">{formatRupiah(totals.totalSales)}</SkeletonValue>
                        </p>
                    </div>
                </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    {t("orders.selectDate")}
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
                    <p className="text-gray-600">{t("orders.noOrders")}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {t("orders.noOrdersForDate")}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {formatMobileDate(selectedDate, t)}
                        </h3>
                        <span className="text-sm text-gray-500">
                            {hasMore
                                ? `${ordersWithNumbers.length} of ${totals.totalOrders}`
                                : `${totals.totalOrders} order${totals.totalOrders === 1 ? "" : "s"}`}
                        </span>
                    </div>

                    {ordersWithNumbers.map((order) => (
                        <details
                            key={order.id}
                            className="bg-white rounded-2xl overflow-hidden group"
                        >
                            <summary className="p-3.5 bg-white list-none cursor-pointer [&::-webkit-details-marker]:hidden">
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
                                            {t("orders.cups")}
                                        </p>
                                    </div>
                                    <ChevronDown
                                        size={18}
                                        className="text-gray-400 mt-1 shrink-0 transition-transform group-open:rotate-180"
                                    />
                                </div>
                            </summary>

                            <div className="border-t border-gray-100 p-3 bg-slate-100">
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-2 text-sm">
                                            {t("orders.orderDetails")}
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
                                                    {t("orders.seller")}:
                                                </span>{" "}
                                                {order.users?.fullName}
                                            </p>
                                            <p>
                                                <span className="font-medium">
                                                    {t("orders.fullTimestamp")}:
                                                </span>{" "}
                                                {new Date(
                                                    order.createdAt + "Z",
                                                ).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-800 mb-1 text-sm">
                                            {t("orders.items")}
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
                                                            {t("orders.each")}
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
                        </details>
                    ))}

                    {hasMore && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="w-full py-3 rounded-2xl bg-white text-sm font-medium text-gray-700 active:bg-gray-50"
                        >
                            {t("orders.showAll")}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
