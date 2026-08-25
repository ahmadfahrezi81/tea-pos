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
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { SkeletonChart } from "@tea-pos/ui/custom/Skeleton";

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

// Daily tea-waste goal (litres). Lower is better — bars at/under this stay
// green, over turns red. TODO: make store-configurable via settings.
const TARGET_LITERS = 12;

const GOOD_COLOR = "#16a34a"; // green-600 — at or under target
const BAD_COLOR = "#dc2626"; // red-600 — over target

// Tea costs ~Rp 250/cup and a litre pours ~4 cups, so a wasted litre is
// ~Rp 1.000. TODO: make store-configurable alongside TARGET_LITERS.
const COST_PER_LITER = 1000;

// Declared at module scope, not inside the chart. A component created during
// render gets a fresh identity every time, so React treats it as a different
// type and remounts the tooltip on each parent render instead of updating it.
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

export default function TeaWasteChart({ storeId, month }: Props) {
    const { data: teaWaste = [], isLoading } = useTeaWaste(storeId, month);
    const scrollRef = useRef<HTMLDivElement>(null);
    const t = useT();

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

    // Rp wasted for the month, plus a per-day average over every day with a
    // closing reading — 0 L days included — not the full calendar month.
    const { totalCost, avgCostPerDay } = useMemo(() => {
        const cost = totalLiters * COST_PER_LITER;
        return {
            totalCost: cost,
            avgCostPerDay: teaWaste.length ? cost / teaWaste.length : 0,
        };
    }, [totalLiters, teaWaste.length]);

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
        // 0 is a valid reading and must stay labelled — only skip missing ones.
        if (value === null || value === undefined) return null;
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

    const slotWidth = 60;
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
            <SkeletonChart height={220} />
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
                    <p className="text-2xl font-bold text-red-600 whitespace-nowrap">
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
                            />
                            {/* minPointSize keeps a 0 L day as a visible sliver
                                on the axis instead of nothing at all. */}
                            <Bar
                                dataKey="liters"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={36}
                                minPointSize={2}
                            >
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

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("analytics.teaWasteCostTitle")}
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between">
                        <dt className="text-gray-500">
                            {t("analytics.teaWasteLitresWasted")}
                        </dt>
                        <dd className="font-medium text-gray-700">
                            {totalLiters} L
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <dt className="text-gray-500">
                            {t("analytics.teaWasteCostPerLitre")}
                        </dt>
                        <dd className="font-medium text-gray-700">
                            {formatRupiah(COST_PER_LITER)}
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <dt className="text-gray-500">
                            {t("analytics.avgPerDay")}
                        </dt>
                        <dd className="font-medium text-gray-700">
                            {formatRupiah(Math.round(avgCostPerDay))}
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
                        <dt className="font-medium text-gray-700">
                            {t("analytics.teaWasteTotalCost")}
                        </dt>
                        <dd className="text-base font-bold text-red-600">
                            {formatRupiah(totalCost)}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
