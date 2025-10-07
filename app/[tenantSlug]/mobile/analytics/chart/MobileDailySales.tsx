// components/MobileDailySales.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { CalendarDays, StoreIcon, TrendingUp, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
// import { useTenantSlug } from "@/lib/tenant-url";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import useUserStores from "@/lib/hooks/shared/useUserStores";
import { useAuth } from "@/lib/context/AuthContext";

const formatMonthForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const chartConfig = {
    cups: {
        label: "Cups Sold",
        color: "#175EFA", // Blue color (matches your blue-600)
    },
} satisfies ChartConfig;

export default function MobileDailySales() {
    const { profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    // const { url } = useTenantSlug();

    // Get initial values from URL params or use defaults
    const initialMonth =
        searchParams.get("month") || formatMonthForInput(new Date());
    const initialStoreId = searchParams.get("storeId") || "";

    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedStore, setSelectedStore] = useState<string>(initialStoreId);

    // Fetch user stores
    const { data: storesData, isLoading: storesLoading } = useUserStores(
        profile!.id
    );
    const stores = storesData?.stores ?? [];
    const defaultStore = storesData?.defaultStore;

    // Auto-select default store on mount (only if no store was passed via URL)
    useEffect(() => {
        if (defaultStore && !selectedStore && !initialStoreId) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, initialStoreId]);

    // Fetch daily sales data
    const { data: dailySales = [], isLoading: salesLoading } = useDailySales(
        selectedStore,
        selectedMonth
    );

    // Transform data for chart - format dates as "Oct 15"
    const chartData = useMemo(() => {
        return dailySales.map((item) => {
            const date = new Date(item.date + "T00:00:00");
            const formattedDate = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
            return {
                date: formattedDate,
                dateRaw: item.date, // Keep raw date for tooltip
                cups: item.cups,
            };
        });
    }, [dailySales]);

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const totalCups = dailySales.reduce((sum, item) => sum + item.cups, 0);
        const peakDay = dailySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { date: "N/A", cups: 0 }
        );

        // Format peak day date
        let peakDayFormatted = "N/A";
        if (peakDay.date !== "N/A") {
            const date = new Date(peakDay.date + "T00:00:00");
            peakDayFormatted = date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            });
        }

        const avgCups =
            dailySales.length > 0
                ? Math.round(totalCups / dailySales.length)
                : 0;

        return {
            totalCups,
            peakDay: { ...peakDay, dateFormatted: peakDayFormatted },
            avgCups,
        };
    }, [dailySales]);

    const isLoading = storesLoading || salesLoading;

    if (isLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">
                    Loading Analytics...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors active:scale-95 duration-75"
            >
                <ChevronLeft size={24} />
                <span className="font-medium text-md mb-0.5">
                    Back to Analytics
                </span>
            </button>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="grid grid-cols-1 gap-3">
                    {/* Month Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <CalendarDays size={16} className="inline mr-1" />
                            Select Month
                        </label>
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue === "") {
                                    const currentMonth = formatMonthForInput(
                                        new Date()
                                    );
                                    setSelectedMonth(currentMonth);
                                } else {
                                    setSelectedMonth(newValue);
                                }
                            }}
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
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Card */}
            <Card className="py-4 gap-4 [&>*]:px-4">
                <CardHeader>
                    <CardTitle>Daily Sales</CardTitle>
                    <CardDescription>
                        Cup sales throughout the month
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0! ml-[-5px] mb-[-40px]">
                    {chartData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No sales data for this month
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={chartData}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    bottom: 20,
                                    left: 0,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="cups"
                                    fill="var(--color-cups)"
                                    radius={8}
                                />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
                {chartData.length > 0 && (
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            Peak day: {summaryStats.peakDay.dateFormatted} (
                            {summaryStats.peakDay.cups} cups)
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-muted-foreground leading-none">
                            Total: {summaryStats.totalCups} cups | Avg:{" "}
                            {summaryStats.avgCups} cups/day
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
