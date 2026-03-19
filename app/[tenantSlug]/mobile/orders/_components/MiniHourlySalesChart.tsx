"use client";
import { useMemo, useRef, useEffect } from "react";
import useHourlySales from "@/lib/hooks/analytics/useHourlySales";
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
    date: string;
}

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
    const { hour, cups } = payload[0].payload;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{hour}</p>
            <p className="text-blue-600 font-bold">{cups} cups</p>
        </div>
    );
};

export default function MiniHourlySalesChart({ storeId, date }: Props) {
    const { data: hourlySales = [], isLoading } = useHourlySales(storeId, date);
    const scrollRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const { url } = useTenantSlug();

    const peakHour = useMemo(() => {
        return hourlySales.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { hour: "N/A", cups: 0 },
        );
    }, [hourlySales]);

    const peakIndex = useMemo(() => {
        return hourlySales.findIndex((d) => d.hour === peakHour.hour);
    }, [hourlySales, peakHour]);

    const slotWidth = 75;
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

    if (isLoading) {
        return (
            <div
                className="mt-3 border-t border-gray-100 bg-gray-200 rounded-xl animate-pulse relative"
                style={{ height: 170 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (hourlySales.length === 0) return null;

    return (
        <div className="mt-3 border-t border-gray-100 bg-white rounded-xl shadow-sm p-2 pb-1">
            <div className="flex justify-end mb-1">
                <button
                    onClick={() => {
                        const params = new URLSearchParams();
                        params.set("date", date);
                        params.set("storeId", storeId);
                        router.push(
                            `${url("/mobile/orders/chart")}?${params.toString()}`,
                        );
                    }}
                    className="bg-blue-600 transition-colors p-1 rounded active:scale-90"
                >
                    <SquareArrowOutUpRight size={18} className="text-white" />
                </button>
            </div>
            {/* ref goes on the scrollable container */}
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
                            data={hourlySales}
                            margin={{ top: 20, right: 16, bottom: 0, left: 16 }}
                        >
                            <defs>
                                <linearGradient
                                    id="fillCupsMini"
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
                                fill="url(#fillCupsMini)"
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
                                            peakHour={peakHour.hour}
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
