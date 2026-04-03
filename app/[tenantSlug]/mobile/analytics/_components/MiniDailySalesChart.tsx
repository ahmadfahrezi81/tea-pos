"use client";
import { useMemo, useRef, useEffect } from "react";
import { DailySummary } from "@/lib/schemas/daily-summaries";
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
import { useTenantSlug } from "@/lib/tenant-url";
import { useBrandColor } from "@/lib/hooks/useBrandColor";
import { navigation } from "@/lib/utils/navigation";

interface Props {
    summaries: DailySummary[];
    storeId: string;
    month: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { x, y, value, payload, peakDate } = props;
    if (!value || value === 0) return null;
    const isPeak = (payload?.dateRaw ?? "") === peakDate;
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
            <p className="text-brand font-bold">{cups} cups</p>
        </div>
    );
};

export default function MiniDailySalesChart({
    summaries,
    storeId,
    month,
}: Props) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { url } = useTenantSlug();
    const brandColor = useBrandColor();

    const chartConfig = useMemo(
        () =>
            ({
                cups: { label: "Cups Sold", color: brandColor },
            }) satisfies ChartConfig,
        [brandColor],
    );

    // Derive chart data directly from summaries — no extra fetch needed
    const chartData = useMemo(() => {
        return [...summaries]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((s) => ({
                date: new Date(s.date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    {
                        month: "short",
                        day: "numeric",
                    },
                ),
                dateRaw: s.date,
                cups: s.totalCups,
            }));
    }, [summaries]);

    const peakDate = useMemo(() => {
        return chartData.reduce(
            (max, item) => (item.cups > max.cups ? item : max),
            { dateRaw: "N/A", cups: 0 },
        ).dateRaw;
    }, [chartData]);

    const peakIndex = useMemo(
        () => chartData.findIndex((d) => d.dateRaw === peakDate),
        [chartData, peakDate],
    );

    const slotWidth = 75;
    const chartWidth = Math.max(chartData.length * slotWidth, 300);

    useEffect(() => {
        if (!scrollRef.current || peakIndex === -1) return;
        const containerWidth = scrollRef.current.clientWidth;
        const peakPixel = peakIndex * slotWidth + slotWidth / 2;
        scrollRef.current.scrollTo({
            left: Math.max(0, peakPixel - containerWidth / 2),
            behavior: "smooth",
        });
    }, [peakIndex]);

    if (chartData.length === 0) return null;

    return (
        <div className="mt-3 border-t border-gray-100 bg-white rounded-xl shadow-sm p-2 pb-1">
            <div className="flex justify-end mb-1">
                <button
                    onClick={() => {
                        const params = new URLSearchParams();
                        params.set("month", month);
                        params.set("storeId", storeId);
                        navigation.push(
                            `${url("/mobile/analytics/chart")}?${params.toString()}`,
                        );
                    }}
                    className="bg-brand transition-colors p-1 rounded active:scale-90"
                >
                    <SquareArrowOutUpRight size={18} className="text-white" />
                </button>
            </div>
            <div ref={scrollRef} className="overflow-x-auto no-scrollbar">
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
                                        stopColor={brandColor}
                                        stopOpacity={0.5}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={brandColor}
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
                                    stroke: brandColor,
                                    strokeWidth: 1,
                                    strokeDasharray: "3 3",
                                }}
                            />
                            <Area
                                dataKey="cups"
                                type="step"
                                fill="url(#fillCupsMiniDaily)"
                                fillOpacity={1}
                                stroke={brandColor}
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
