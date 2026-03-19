"use client";
import { useMemo, useRef, useEffect } from "react";
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
import { SquareArrowOutUpRight } from "lucide-react";
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
            fontSize={10}
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

export default function MiniDailySalesChart({ storeId, month }: Props) {
    const { data: dailySales = [], isLoading } = useDailySales(storeId, month);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { url } = useTenantSlug();

    // Map to chart-friendly format
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

    const peakDate = useMemo(() => {
        return dailySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { date: "N/A", cups: 0 },
        ).date;
    }, [dailySales]);

    const peakIndex = useMemo(() => {
        return chartData.findIndex((d) => d.dateRaw === peakDate);
    }, [chartData, peakDate]);

    const slotWidth = 75;
    const chartWidth = Math.max(chartData.length * slotWidth, 300);

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
    }, [peakIndex, chartData]);

    if (isLoading) {
        return (
            <div
                className="mt-3 border-t border-gray-100 bg-gray-200 rounded-xl animate-pulse"
                style={{ height: 170 }}
            />
        );
    }
    if (chartData.length === 0) return null;

    return (
        <div className="mt-3 border-t border-gray-100 bg-white rounded-xl shadow-sm p-2 pb-1">
            <div className="flex justify-end mb-1">
                <button
                    onClick={() => {
                        const params = new URLSearchParams();
                        params.set("month", month);
                        params.set("storeId", storeId);
                        router.push(
                            `${url("/mobile/analytics/chart")}?${params.toString()}`,
                        );
                    }}
                    className="bg-blue-600 transition-colors p-1 rounded active:scale-90"
                >
                    <SquareArrowOutUpRight size={18} className="text-white" />
                </button>
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
                        style={{ height: 130, width: chartWidth }}
                    >
                        <AreaChart
                            width={chartWidth}
                            height={130}
                            data={chartData}
                            margin={{ top: 20, right: 16, bottom: 0, left: 16 }}
                        >
                            <defs>
                                <linearGradient
                                    id="fillCupsMiniDaily"
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
                                tick={{ fontSize: 9, fill: "#9ca3af" }}
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
                                fill="url(#fillCupsMiniDaily)"
                                fillOpacity={1}
                                stroke="#175EFA"
                                strokeWidth={2.5}
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
