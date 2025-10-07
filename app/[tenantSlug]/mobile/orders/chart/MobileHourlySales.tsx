// components/MobileAnalytics.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import { CalendarDays, StoreIcon, TrendingUp, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import useHourlySales from "@/lib/hooks/analytics/useHourlySales";
import useUserStores from "@/lib/hooks/shared/useUserStores";
import { useAuth } from "@/lib/context/AuthContext";
import { useTenantSlug } from "@/lib/tenant-url";

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

const chartConfig = {
    cups: {
        label: "Cups Sold",
        color: "#175EFA", // Blue color (matches your blue-600)
    },
} satisfies ChartConfig;
export default function MobileHourlySales() {
    const { profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { url } = useTenantSlug();

    // Get initial values from URL params or use defaults
    const initialDate =
        searchParams.get("date") || formatDateForInput(new Date());
    const initialStoreId = searchParams.get("storeId") || "";

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [selectedStore, setSelectedStore] = useState<string>(initialStoreId);

    // const [selectedDate, setSelectedDate] = useState(
    //     formatDateForInput(new Date())
    // );
    // const [selectedStore, setSelectedStore] = useState<string>("");

    // Fetch user stores
    const { data: storesData, isLoading: storesLoading } = useUserStores(
        profile!.id
    );
    const stores = storesData?.stores ?? [];
    const defaultStore = storesData?.defaultStore;

    // // Auto-select default store on mount
    // useEffect(() => {
    //     if (defaultStore && !selectedStore) {
    //         setSelectedStore(defaultStore.id);
    //     }
    // }, [defaultStore, selectedStore]);

    // Auto-select default store on mount (only if no store was passed via URL)
    useEffect(() => {
        if (defaultStore && !selectedStore && !initialStoreId) {
            setSelectedStore(defaultStore.id);
        }
    }, [defaultStore, selectedStore, initialStoreId]);

    // Fetch hourly sales data
    const { data: hourlySales = [], isLoading: salesLoading } = useHourlySales(
        selectedStore,
        selectedDate
    );

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const totalCups = hourlySales.reduce((sum, item) => sum + item.cups, 0);
        const peakHour = hourlySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { hour: "N/A", cups: 0 }
        );

        return { totalCups, peakHour };
    }, [hourlySales]);

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
            {/* <button
                onClick={() => router.back()}
                className="flex items-center text-gray-700 hover:text-gray-900 transition-colors active:scale-95 duration-75"
            >
                <ChevronLeft size={24} />
                <span className="font-medium text-md">Back to Orders</span>
            </button> */}
            <button
                // onClick={() => router.back()}
                onClick={() => router.push(url("/mobile/orders"))}
                className="flex items-center gap-1 text-gray-700 hover:text-gray-900 transition-colors active:scale-95 duration-75"
            >
                <ChevronLeft size={24} />
                <span className="font-medium text-md mb-0.5">
                    Back to Orders
                </span>
            </button>

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
                            onChange={(e) => {
                                const newValue = e.target.value;
                                if (newValue === "") {
                                    const today = new Date()
                                        .toISOString()
                                        .split("T")[0];
                                    setSelectedDate(today);
                                } else {
                                    setSelectedDate(newValue);
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
                    <CardTitle>Hourly Sales</CardTitle>
                    <CardDescription>
                        Cup sales throughout the day
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0! ml-[-10px]">
                    {hourlySales.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                            No sales data for this date
                        </div>
                    ) : (
                        <ChartContainer config={chartConfig}>
                            <BarChart
                                accessibilityLayer
                                data={hourlySales}
                                margin={{
                                    top: 20,
                                    right: 20,
                                    bottom: 20,
                                    left: 0,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="hour"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                />
                                {/* <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                /> */}
                                <YAxis
                                    allowDecimals={false}
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
                {hourlySales.length > 0 && (
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 leading-none font-medium">
                            Peak hour: {summaryStats.peakHour.hour} (
                            {summaryStats.peakHour.cups} cups)
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-muted-foreground leading-none">
                            Total cups sold today: {summaryStats.totalCups}
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
