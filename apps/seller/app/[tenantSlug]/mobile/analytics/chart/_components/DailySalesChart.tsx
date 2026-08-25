"use client";
import { useMemo, useRef, useEffect } from "react";
import { useT } from "@/lib/hooks/useT";
import useDailySales from "@/lib/hooks/analytics/useDailySales";
import {
    Area,
    AreaChart,
    XAxis,
    ReferenceLine,
    Tooltip,
    LabelList,
} from "recharts";
import { ChartConfig, ChartContainer } from "@tea-pos/ui/components/chart";
import { useBrandColor } from "@/lib/hooks/useBrandColor";
import { SkeletonChart } from "@tea-pos/ui/custom/Skeleton";

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

const formatDayLabel = (isoDate: string) =>
    new Date(isoDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });

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

// Declared at module scope, not inside the chart. A component created during
// render gets a fresh identity every time, so React treats it as a different
// type and remounts the tooltip on each parent render instead of updating it.
// It reaches for its own `t` rather than closing over the chart's, which is
// what kept it inside in the first place.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    const t = useT();
    if (!active || !payload?.length) return null;
    const { date, cups } = payload[0].payload;
    return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-md px-3 py-2 text-xs">
            <p className="font-semibold text-gray-700">{date}</p>
            <p className="text-brand font-bold">{cups} {t("analytics.cups")}</p>
        </div>
    );
};

export default function DailySalesChart({ storeId, month }: Props) {
    const { data: dailySales = [], isLoading } = useDailySales(storeId, month);
    const scrollRef = useRef<HTMLDivElement>(null);
    const brandColor = useBrandColor();
    const t = useT();

    const chartConfig = useMemo(
        () =>
            ({
                cups: {
                    label: t("analytics.cupsSoldLabel"),
                    color: brandColor,
                },
            }) satisfies ChartConfig,
        [brandColor, t],
    );

    const chartData = useMemo(() => {
        return dailySales.map((item) => ({
            date: formatDayLabel(item.date),
            dateRaw: item.date,
            cups: item.cups,
        }));
    }, [dailySales]);

    const totalCups = useMemo(() => {
        return dailySales.reduce((sum, item) => sum + item.cups, 0);
    }, [dailySales]);

    // Best / worst day and the daily average, over the days that actually
    // have sales — not every calendar day in the month.
    const { highestDay, lowestDay, avgCups } = useMemo(() => {
        if (dailySales.length === 0) {
            return { highestDay: null, lowestDay: null, avgCups: 0 };
        }
        let highest = dailySales[0];
        let lowest = dailySales[0];
        for (const item of dailySales) {
            if (item.cups > highest.cups) highest = item;
            if (item.cups < lowest.cups) lowest = item;
        }
        return {
            highestDay: highest,
            lowestDay: lowest,
            avgCups: Math.round(totalCups / dailySales.length),
        };
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
                        {t("analytics.dailySalesTitle")}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {t("analytics.dailySalesSubtitle")}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-800">
                        {t("analytics.total")}
                    </p>
                    <p className="text-2xl font-bold text-brand">
                        {totalCups}
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
                                tick={{ fontSize: 12, fill: "#9ca3af" }}
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
                                fill="url(#fillCupsMiniDailyV2)"
                                fillOpacity={1}
                                stroke={brandColor}
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

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("analytics.dailySalesBreakdownTitle")}
                </p>
                <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex items-baseline justify-between">
                        <dt className="text-gray-500">
                            {t("analytics.highestDay")}
                        </dt>
                        <dd className="font-medium text-gray-700">
                            {highestDay?.cups ?? 0}{" "}
                            <span className="text-gray-400">
                                {highestDay
                                    ? formatDayLabel(highestDay.date)
                                    : "—"}
                            </span>
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <dt className="text-gray-500">
                            {t("analytics.lowestDay")}
                        </dt>
                        <dd className="font-medium text-gray-700">
                            {lowestDay?.cups ?? 0}{" "}
                            <span className="text-gray-400">
                                {lowestDay
                                    ? formatDayLabel(lowestDay.date)
                                    : "—"}
                            </span>
                        </dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
                        <dt className="font-medium text-gray-700">
                            {t("analytics.avgPerDay")}
                        </dt>
                        <dd className="text-base font-bold text-brand">
                            {avgCups}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
