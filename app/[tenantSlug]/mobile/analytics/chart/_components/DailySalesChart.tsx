"use client";
import { useMemo, useRef, useEffect, useState } from "react";
import useDailySales from "@/lib/hooks/analytics/useDailySales";
import {
    Area,
    AreaChart,
    XAxis,
    ReferenceLine,
    Tooltip,
    LabelList,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/tenant-url";

const chartConfig = {
    cups: {
        label: "Cups Sold",
        color: "#175EFA",
    },
} satisfies ChartConfig;

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { x, y, value, payload, peakDate } = props;
    if (!value || value === 0) return null;

    const date: string = payload?.dateRaw ?? "";
    const isPeak = date === peakDate;

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
    const { date, cups } = payload[0].payload;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{date}</p>
            <p className="text-blue-600 font-bold">{cups} cups</p>
        </div>
    );
};

export default function DailySalesChart({ storeId, month }: Props) {
    const { data: dailySales = [], isLoading } = useDailySales(storeId, month);
    const scrollRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();
    const { url } = useTenantSlug();
    const [isScrolling, setIsScrolling] = useState(false);

    const chartData = useMemo(() => {
        return dailySales.map((item) => ({
            date: new Date(item.date + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    day: "numeric",
                },
            ),
            dateRaw: item.date,
            cups: item.cups,
        }));
    }, [dailySales]);

    const totalCups = useMemo(() => {
        return dailySales.reduce((sum, item) => sum + item.cups, 0);
    }, [dailySales]);

    const avgCups = useMemo(() => {
        return dailySales.length > 0
            ? Math.round(totalCups / dailySales.length)
            : 0;
    }, [dailySales, totalCups]);

    const peakDate = useMemo(() => {
        return dailySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { date: "N/A", cups: 0 },
        ).date;
    }, [dailySales]);

    const peakIndex = useMemo(() => {
        return chartData.findIndex((d) => d.dateRaw === peakDate);
    }, [chartData, peakDate]);

    const slotWidth = 80;
    const chartWidth = Math.max(chartData.length * slotWidth, 300);

    // ✅ Auto-scroll to peak on data change
    useEffect(() => {
        if (!scrollRef.current || peakIndex === -1) return;

        const containerWidth = scrollRef.current.clientWidth;
        const peakPixel = peakIndex * slotWidth + slotWidth / 2;
        const scrollTo = peakPixel - containerWidth / 2;

        scrollRef.current.scrollTo({
            left: Math.max(0, scrollTo),
            behavior: "smooth",
        });
    }, [peakIndex, chartData]);

    // ✅ Detect scrolling — switch label, reset after 800ms of no scrolling
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const handleScroll = () => {
            setIsScrolling(true);

            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 800);
        };

        el.addEventListener("scroll", handleScroll);
        return () => {
            el.removeEventListener("scroll", handleScroll);
            if (scrollTimeoutRef.current)
                clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

    if (isLoading) {
        return (
            <div
                className="bg-gray-200 rounded-xl animate-pulse relative"
                style={{ height: 220 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                        Daily Sales
                    </h3>
                    <p className="text-sm text-gray-400">
                        Cup sales throughout the month
                    </p>
                </div>
                {/* ✅ Toggles between Total and Avg while scrolling */}
                <div
                    className="text-right transition-all duration-300"
                    key={isScrolling ? "avg" : "total"}
                >
                    <p className="text-xs text-gray-800">
                        {isScrolling ? "Avg / day" : "Total"}
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                        {isScrolling ? avgCups : totalCups}
                    </p>
                </div>
            </div>
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
                        style={{ height: 220, width: chartWidth }}
                    >
                        <AreaChart
                            width={chartWidth}
                            height={220}
                            data={chartData}
                            margin={{ top: 20, right: 16, bottom: 0, left: 16 }}
                        >
                            <defs>
                                <linearGradient
                                    id="fillCupsMiniDailyV2"
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
                            {chartData.map((entry) => (
                                <ReferenceLine
                                    key={entry.dateRaw}
                                    x={entry.date}
                                    stroke="#e5e7eb"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                />
                            ))}
                            <XAxis
                                dataKey="date"
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
                                fill="url(#fillCupsMiniDailyV2)"
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
                                            peakDate={peakDate}
                                        />
                                    )}
                                />
                            </Area>
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
}
