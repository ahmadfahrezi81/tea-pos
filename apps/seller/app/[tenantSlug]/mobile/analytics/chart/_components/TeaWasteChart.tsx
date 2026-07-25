"use client";
import { useMemo, useRef, useEffect } from "react";
import { useT } from "@/lib/hooks/useT";
import useTeaWaste from "@/lib/hooks/analytics/useTeaWaste";
import {
    Bar,
    BarChart,
    Cell,
    XAxis,
    YAxis,
    ReferenceLine,
    Tooltip,
    LabelList,
} from "recharts";
import { ChartConfig, ChartContainer } from "@tea-pos/ui/components/chart";

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

// Daily tea-waste goal (litres). Lower is better — bars at/under this stay
// green, over turns red. TODO: make store-configurable via settings.
const TARGET_LITERS = 8;

const GOOD_COLOR = "#16a34a"; // green-600 — at or under target
const BAD_COLOR = "#dc2626"; // red-600 — over target

export default function TeaWasteChart({ storeId, month }: Props) {
    const { data: teaWaste = [], isLoading } = useTeaWaste(storeId, month);
    const scrollRef = useRef<HTMLDivElement>(null);
    const t = useT();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        const { date, liters } = payload[0].payload;
        const over = liters > TARGET_LITERS;
        return (
            <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
                <p className="font-semibold text-gray-700">{date}</p>
                <p className="font-bold" style={{ color: over ? BAD_COLOR : GOOD_COLOR }}>
                    {liters} L
                </p>
            </div>
        );
    };

    const chartData = useMemo(() => {
        return teaWaste.map((item) => ({
            date: new Date(item.date + "T00:00:00").toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    day: "numeric",
                },
            ),
            dateRaw: item.date,
            liters: item.liters,
        }));
    }, [teaWaste]);

    const totalLiters = useMemo(() => {
        const sum = teaWaste.reduce((acc, item) => acc + item.liters, 0);
        return Math.round(sum * 10) / 10;
    }, [teaWaste]);

    const maxLiters = useMemo(
        () => teaWaste.reduce((max, item) => Math.max(max, item.liters), 0),
        [teaWaste],
    );

    // Keep the target line and tallest bar comfortably in view.
    const yMax = useMemo(
        () => Math.ceil(Math.max(maxLiters, TARGET_LITERS) * 1.25),
        [maxLiters],
    );

    const peakDate = useMemo(() => {
        return teaWaste.reduce(
            (max, item) => (item.liters > max.liters ? item : max),
            { date: "N/A", liters: 0 },
        ).date;
    }, [teaWaste]);

    const peakIndex = useMemo(() => {
        return chartData.findIndex((d) => d.dateRaw === peakDate);
    }, [chartData, peakDate]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomBarLabel = (props: any) => {
        const { x, y, width, value, index } = props;
        if (!value || value === 0) return null;
        const isPeak = index === peakIndex;
        return (
            <text
                x={x + width / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize={12}
                fontWeight={isPeak ? 700 : 400}
                fill="#374151"
            >
                {value}
            </text>
        );
    };

    const chartConfig = useMemo(
        () =>
            ({
                liters: {
                    label: t("analytics.teaWasteTitle"),
                    color: GOOD_COLOR,
                },
            }) satisfies ChartConfig,
        [t],
    );

    const slotWidth = 80;
    const chartWidth = Math.max(chartData.length * slotWidth, 300);

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
                className="bg-gray-200 rounded-xl animate-pulse relative"
                style={{ height: 220 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (chartData.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                        {t("analytics.teaWasteTitle")}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {t("analytics.teaWasteSubtitle")}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-xs text-gray-800">
                        {t("analytics.total")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                        {totalLiters}L
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
                        <BarChart
                            width={chartWidth}
                            height={220}
                            data={chartData}
                            margin={{ top: 24, right: 16, bottom: 0, left: 16 }}
                        >
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontSize: 12, fill: "#9ca3af" }}
                                tickMargin={6}
                                interval={0}
                            />
                            <YAxis hide domain={[0, yMax]} />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                            />
                            <ReferenceLine
                                y={TARGET_LITERS}
                                stroke="#9ca3af"
                                strokeDasharray="4 4"
                                strokeWidth={1.5}
                                label={{
                                    value: `Target ${TARGET_LITERS}L`,
                                    position: "insideTopRight",
                                    fill: "#9ca3af",
                                    fontSize: 11,
                                    fontWeight: 600,
                                }}
                            />
                            <Bar dataKey="liters" radius={[4, 4, 0, 0]} maxBarSize={44}>
                                {chartData.map((entry) => (
                                    <Cell
                                        key={entry.dateRaw}
                                        fill={entry.liters > TARGET_LITERS ? BAD_COLOR : GOOD_COLOR}
                                    />
                                ))}
                                <LabelList
                                    dataKey="liters"
                                    position="top"
                                    content={CustomBarLabel}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
}
