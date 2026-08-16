"use client";

import { useMemo, useRef, useEffect } from "react";
import { Area, AreaChart, XAxis, ReferenceLine, Tooltip, LabelList } from "recharts";
import { ChartContainer, type ChartConfig } from "@tea-pos/ui/components/chart";
import { useDailySales } from "@/lib/hooks/dashboard/useDashboard";

/* The seller's mini daily chart, asked tenant-wide: cups a day summed over
   every active store. No drill-down and no month picker — the dashboard is a
   glance, and anything deeper belongs on a screen of its own. */

const DAYS = 14;

/* Same value as --accent-primary in globals.css. Recharts writes stroke and
   fill as SVG presentation attributes, where a CSS var() never resolves, so the
   token cannot be used here. */
const BRAND = "oklch(0.646 0.222 41.116)";

/* Narrower slots than the seller's chart: a fortnight has to fit a phone with
   one short swipe rather than a long scroll. */
const SLOT_WIDTH = 46;

const chartConfig = { cups: { label: "Cups", color: BRAND } } satisfies ChartConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { x, y, value, payload, peakDate } = props;
    if (!value) return null;
    const isPeak = (payload?.dateRaw ?? "") === peakDate;
    return (
        <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fontWeight={isPeak ? 700 : 400}>
            {value}
        </text>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { date, cups, orders } = payload[0].payload;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{date}</p>
            <p className="text-brand font-bold">{cups} cups</p>
            <p className="text-gray-500">{orders} orders</p>
        </div>
    );
};

export default function DailySalesChart() {
    const { points, totals, isLoading } = useDailySales(DAYS);
    const scrollRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(
        () =>
            points.map((p) => ({
                date: new Date(p.date + "T00:00:00").toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                dateRaw: p.date,
                cups: p.cups,
                orders: p.orders,
            })),
        [points],
    );

    const peakDate = useMemo(
        () => chartData.reduce((max, d) => (d.cups > max.cups ? d : max), { dateRaw: "", cups: 0 }).dateRaw,
        [chartData],
    );

    /* Anchored to the right on load: the newest day is the one being looked
       for, and a fortnight is short enough that the rest is one swipe away. */
    useEffect(() => {
        if (isLoading || !scrollRef.current) return;
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-3">
                <div className="h-[150px] bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    const chartWidth = Math.max(chartData.length * SLOT_WIDTH, 300);

    return (
        <div className="bg-white rounded-2xl p-3 pb-1 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">Cups sold</p>
                <p className="text-xs font-medium text-gray-500">
                    Last {DAYS} days ·{" "}
                    <span className="font-mono font-bold text-gray-900">{totals?.cups ?? 0}</span> cups
                </p>
            </div>

            <div ref={scrollRef} className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <div style={{ width: chartWidth }}>
                    <ChartContainer config={chartConfig} style={{ height: 130, width: chartWidth }}>
                        <AreaChart
                            width={chartWidth}
                            height={130}
                            data={chartData}
                            margin={{ top: 18, right: 12, bottom: 0, left: 12 }}
                        >
                            <defs>
                                <linearGradient id="fillCupsDashboard" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={BRAND} stopOpacity={0.5} />
                                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
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
                                cursor={{ stroke: BRAND, strokeWidth: 1, strokeDasharray: "3 3" }}
                            />
                            <Area
                                dataKey="cups"
                                type="step"
                                fill="url(#fillCupsDashboard)"
                                fillOpacity={1}
                                stroke={BRAND}
                                strokeWidth={2.5}
                                dot={false}
                            >
                                <LabelList
                                    dataKey="cups"
                                    position="top"
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    content={(props: any) => <CustomLabel {...props} peakDate={peakDate} />}
                                />
                            </Area>
                        </AreaChart>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
}
