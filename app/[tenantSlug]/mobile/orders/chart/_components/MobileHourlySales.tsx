"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { CalendarDays, ChevronsUpDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Area,
    AreaChart,
    XAxis,
    ReferenceLine,
    Tooltip,
    LabelList,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import useHourlySales from "@/lib/hooks/analytics/useHourlySales";
import { useTenantSlug } from "@/lib/tenant-url";
import { useStore } from "@/lib/context/StoreContext";

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0];

const chartConfig = {
    cups: {
        label: "Cups Sold",
        color: "#175EFA",
    },
} satisfies ChartConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { x, y, value, payload, peakHour } = props;
    if (!value || value === 0) return null;

    const hour: string = payload?.hour ?? "";
    const isPeak = hour === peakHour;

    return (
        <text
            x={x}
            y={y - 12}
            textAnchor="middle"
            fontSize={12}
            fontWeight={isPeak ? 700 : 400}
        >
            {value}
        </text>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { hour, cups } = payload[0].payload;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{hour}</p>
            <p className="text-blue-600 font-bold">{cups} cups</p>
        </div>
    );
};

export default function MobileHourlySales() {
    const { selectedStoreId, selectedStore, setIsPickerOpen } = useStore();
    const searchParams = useSearchParams();
    const { url } = useTenantSlug();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [selectedDate, setSelectedDate] = useState(
        searchParams.get("date") || formatDateForInput(new Date()),
    );

    const { data: hourlySales = [], isLoading: salesLoading } = useHourlySales(
        selectedStoreId,
        selectedDate,
    );

    const peakHour = useMemo(() => {
        return hourlySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { hour: "N/A", cups: 0 },
        );
    }, [hourlySales]);

    const totalCups = useMemo(() => {
        return hourlySales.reduce((sum, item) => sum + item.cups, 0);
    }, [hourlySales]);

    const peakIndex = useMemo(() => {
        return hourlySales.findIndex((d) => d.hour === peakHour.hour);
    }, [hourlySales, peakHour]);

    const slotWidth = 80;
    const chartWidth = Math.max(hourlySales.length * slotWidth, 300);

    // ✅ Auto-scroll to center the peak whenever data changes
    useEffect(() => {
        if (!scrollRef.current || peakIndex === -1) return;

        const containerWidth = scrollRef.current.clientWidth;
        const peakPixel = peakIndex * slotWidth + slotWidth / 2;
        const scrollTo = peakPixel - containerWidth / 2;

        scrollRef.current.scrollTo({
            left: Math.max(0, scrollTo),
            behavior: "smooth",
        });
    }, [peakIndex, hourlySales]);

    if (salesLoading) {
        return (
            <div
                className="flex flex-col items-center justify-center"
                style={{ minHeight: "calc(100vh - 200px)" }}
            >
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600 text-sm">Loading Chart...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                    Daily Chart
                </h1>
                {selectedStore && (
                    <button
                        onClick={() => setIsPickerOpen(true)}
                        className="flex items-center mt-1 gap-0.5 active:scale-95"
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
                                ? formatDateForInput(new Date())
                                : newValue,
                        );
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                            Hourly Sales
                        </h3>
                        <p className="text-sm text-gray-400">
                            Cup sales throughout the day
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-800">Total</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {totalCups}
                        </p>
                    </div>
                </div>
                {hourlySales.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
                        No sales data for this date
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="overflow-x-auto no-scrollbar"
                        style={{
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                        }}
                    >
                        <div style={{ width: chartWidth }}>
                            <ChartContainer
                                config={chartConfig}
                                style={{ height: 200, width: chartWidth }}
                            >
                                <AreaChart
                                    width={chartWidth}
                                    height={200}
                                    data={hourlySales}
                                    margin={{
                                        top: 20,
                                        right: 16,
                                        bottom: 0,
                                        left: 16,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="fillCupsHourly"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="#175EFA"
                                                stopOpacity={0.5}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="#175EFA"
                                                stopOpacity={0}
                                            />
                                        </linearGradient>
                                    </defs>
                                    {hourlySales.map((entry) => (
                                        <ReferenceLine
                                            key={entry.hour}
                                            x={entry.hour}
                                            stroke="#e5e7eb"
                                            strokeDasharray="3 3"
                                            strokeWidth={1}
                                        />
                                    ))}
                                    <XAxis
                                        dataKey="hour"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 12, fill: "#9ca3af" }}
                                        tickMargin={6}
                                        interval={0}
                                    />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{
                                            stroke: "#175EFA",
                                            strokeWidth: 1,
                                            strokeDasharray: "3 3",
                                        }}
                                    />
                                    <Area
                                        dataKey="cups"
                                        type="step"
                                        fill="url(#fillCupsHourly)"
                                        fillOpacity={1}
                                        stroke="#175EFA"
                                        strokeWidth={3}
                                        dot={false}
                                    >
                                        <LabelList
                                            dataKey="cups"
                                            position="top"
                                            content={(props) => (
                                                <CustomLabel
                                                    {...props}
                                                    peakHour={peakHour.hour}
                                                />
                                            )}
                                        />
                                    </Area>
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
