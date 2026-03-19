"use client";
import { useState, useMemo } from "react";
import {
    CalendarDays,
    TrendingUp,
    ChevronLeft,
    Package,
    Calendar,
    ChevronsUpDown,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";
import {
    Area,
    AreaChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ReferenceLine,
    Dot,
} from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import useDailySales from "@/lib/hooks/analytics/useDailySales";
import useProductSales from "@/lib/hooks/analytics/useProductSales";
import useDayOfWeekSales from "@/lib/hooks/analytics/useDayOfWeekSales";
import { useStore } from "@/lib/context/StoreContext";
import DailySalesChart from "./DailySalesChart";

const formatMonthForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const dailySalesChartConfig = {
    cups: {
        label: "Cups Sold",
        color: "#175EFA",
    },
} satisfies ChartConfig;

const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 55%)`;
};

const generateDayColor = (index: number) => {
    const colors = [
        "#ef4444",
        "#3b82f6",
        "#10b981",
        "#f59e0b",
        "#8b5cf6",
        "#ec4899",
        "#06b6d4",
    ];
    return colors[index] || "#6b7280";
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
    const { cx, cy, payload, peakDate } = props;
    const isPeak = payload.dateRaw === peakDate;
    return (
        <Dot
            cx={cx}
            cy={cy}
            r={4}
            fill={isPeak ? "#ef4444" : "#175EFA"}
            stroke={isPeak ? "#fff" : "none"}
            strokeWidth={isPeak ? 2 : 0}
        />
    );
};

export default function MobileDailySales() {
    const { selectedStoreId, selectedStore, setIsPickerOpen } = useStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { url } = useTenantSlug();

    const [selectedMonth, setSelectedMonth] = useState(
        searchParams.get("month") || formatMonthForInput(new Date()),
    );

    const { data: dailySales = [], isLoading: salesLoading } = useDailySales(
        selectedStoreId,
        selectedMonth,
    );
    const { data: productSalesData, isLoading: productSalesLoading } =
        useProductSales(selectedStoreId, selectedMonth);
    const { data: dayOfWeekData, isLoading: dayOfWeekLoading } =
        useDayOfWeekSales(selectedStoreId, selectedMonth);

    const productSales = useMemo(
        () => productSalesData?.data ?? [],
        [productSalesData],
    );
    const totalProductQuantity = productSalesData?.totalQuantity ?? 0;

    const dailyChartData = useMemo(
        () =>
            dailySales.map((item) => {
                const date = new Date(item.date + "T00:00:00");
                return {
                    date: date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                    }),
                    dateRaw: item.date,
                    cups: item.cups,
                };
            }),
        [dailySales],
    );

    const productChartData = useMemo(
        () =>
            productSales.map((item, index) => ({
                ...item,
                fill: generateColor(index, productSales.length),
            })),
        [productSales],
    );

    const dailySummaryStats = useMemo(() => {
        const totalCups = dailySales.reduce((sum, item) => sum + item.cups, 0);
        const peakDay = dailySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { date: "N/A", cups: 0 },
        );

        let peakDayFormatted = "N/A";
        if (peakDay.date !== "N/A") {
            peakDayFormatted = new Date(
                peakDay.date + "T00:00:00",
            ).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }

        return {
            totalCups,
            peakDay: { ...peakDay, dateFormatted: peakDayFormatted },
            avgCups:
                dailySales.length > 0
                    ? Math.round(totalCups / dailySales.length)
                    : 0,
        };
    }, [dailySales]);

    const dayOfWeekChartData = useMemo(
        () =>
            (dayOfWeekData?.data ?? []).map((item) => ({
                ...item,
                fill: generateDayColor(item.dayIndex),
            })),
        [dayOfWeekData],
    );

    if (salesLoading || productSalesLoading || dayOfWeekLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">
                    Loading Monthly Chart...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                    Monthly Chart
                </h1>
                {selectedStore && (
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center mt-1 gap-0.5"
                    >
                        <p className="text-lg text-blue-600/90 font-bold">
                            {selectedStore.name}
                        </p>
                        <ChevronsUpDown
                            size={14}
                            strokeWidth={3}
                            className="text-blue-600/90"
                        />
                    </button>
                )}
            </div>

            {/* Month Filter */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    Select Month
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                        const newValue = e.target.value;
                        setSelectedMonth(
                            newValue === ""
                                ? formatMonthForInput(new Date())
                                : newValue,
                        );
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <DailySalesChart storeId={selectedStoreId} month={selectedMonth} />

            {/* Day of Week Chart */}
            <Card className="py-4 gap-4 [&>*]:px-4">
                <CardHeader>
                    <CardTitle>Day of Week Average</CardTitle>
                    <CardDescription>
                        Average cup sales by day of the week
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {dayOfWeekChartData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-gray-500">
                            No sales data for this month
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {dayOfWeekChartData.map((day) => (
                                <div key={day.dayOfWeek} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-sm"
                                                style={{
                                                    backgroundColor: day.fill,
                                                }}
                                            />
                                            <span className="font-medium">
                                                {day.dayOfWeek}
                                            </span>
                                        </div>
                                        <span className="text-muted-foreground">
                                            {day.averageCups.toFixed(1)} avg
                                            cups
                                            {day.occurrences > 0 && (
                                                <span className="text-xs ml-1">
                                                    ({day.occurrences}x)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{
                                                width: `${(day.averageCups / Math.max(...dayOfWeekChartData.map((d) => d.averageCups))) * 100}%`,
                                                backgroundColor: day.fill,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                {dayOfWeekChartData.length > 0 && (
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            <Calendar className="h-4 w-4" />
                            Best day:{" "}
                            {
                                dayOfWeekChartData.reduce((max, day) =>
                                    day.averageCups > max.averageCups
                                        ? day
                                        : max,
                                ).dayOfWeek
                            }
                        </div>
                        <div className="text-muted-foreground leading-none">
                            {dayOfWeekChartData
                                .reduce((max, day) =>
                                    day.averageCups > max.averageCups
                                        ? day
                                        : max,
                                )
                                .averageCups.toFixed(1)}{" "}
                            average cups sold
                        </div>
                    </CardFooter>
                )}
            </Card>

            {/* Product Sales Chart */}
            <Card className="py-4 gap-4 [&>*]:px-4">
                <CardHeader>
                    <CardTitle>Product Sales</CardTitle>
                    <CardDescription>
                        Breakdown by product for the month
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {productChartData.length === 0 ? (
                        <div className="h-[200px] flex items-center justify-center text-gray-500">
                            No product sales data for this month
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {productChartData.map((product) => (
                                <div
                                    key={product.productId}
                                    className="space-y-1"
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-sm"
                                                style={{
                                                    backgroundColor:
                                                        product.fill,
                                                }}
                                            />
                                            <span className="font-medium">
                                                {product.productName}
                                            </span>
                                        </div>
                                        <span className="text-muted-foreground">
                                            {product.quantity} cups (
                                            {product.percentage}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all"
                                            style={{
                                                width: `${product.percentage}%`,
                                                backgroundColor: product.fill,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
                {productChartData.length > 0 && (
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            <Package className="h-4 w-4" />
                            {productChartData.length} products sold this month
                        </div>
                        <div className="text-muted-foreground leading-none">
                            Total: {totalProductQuantity} cups
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
