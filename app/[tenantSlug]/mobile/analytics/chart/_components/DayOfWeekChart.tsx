"use client";
import { useMemo } from "react";
import useDayOfWeekSales from "@/lib/hooks/analytics/useDayOfWeekSales";
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    LabelList,
    Cell,
    CartesianGrid,
} from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

const chartConfig = {
    averageCups: {
        label: "Avg Cups",
        color: "#175EFA",
    },
    label: {
        color: "var(--background)",
    },
} satisfies ChartConfig;

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

export default function DayOfWeekChart({ storeId, month }: Props) {
    const { data: dayOfWeekData, isLoading } = useDayOfWeekSales(
        storeId,
        month,
    );

    const dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ];

    const dayOfWeekChartData = useMemo(
        () =>
            (dayOfWeekData?.data ?? []).sort(
                (a, b) =>
                    dayOrder.indexOf(a.dayOfWeek) -
                    dayOrder.indexOf(b.dayOfWeek),
            ),
        [dayOfWeekData],
    );
    const bestDay = useMemo(() => {
        return dayOfWeekChartData.reduce(
            (max, day) => (day.averageCups > max.averageCups ? day : max),
            dayOfWeekChartData[0],
        );
    }, [dayOfWeekChartData]);

    if (isLoading) {
        return (
            <div
                className="bg-gray-200 rounded-xl animate-pulse relative"
                style={{ height: 150 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (dayOfWeekChartData.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                        Day of Week
                    </h3>
                    <p className="text-sm text-gray-400">Average cups by day</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-800">Best day</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {bestDay?.dayOfWeek}
                    </p>
                </div>
            </div>
            <ChartContainer config={chartConfig} className="w-full h-[280px]">
                <BarChart
                    accessibilityLayer
                    data={dayOfWeekChartData}
                    layout="vertical"
                    margin={{ right: 48 }}
                    barSize={60} // increase this number for fatter bars
                >
                    <CartesianGrid
                        horizontal={false}
                        strokeDasharray="3 3"
                        stroke="#e5e7eb"
                    />
                    <YAxis
                        dataKey="dayOfWeek"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        hide
                    />
                    <XAxis dataKey="averageCups" type="number" hide />
                    <defs>
                        <linearGradient
                            id="peakBarGradient"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                        >
                            <stop
                                offset="5%"
                                stopColor="#175EFA"
                                stopOpacity={0.8}
                            />
                            <stop
                                offset="95%"
                                stopColor="#175EFA"
                                stopOpacity={1}
                            />
                        </linearGradient>
                    </defs>
                    <Bar dataKey="averageCups" layout="vertical" radius={4}>
                        <LabelList
                            dataKey="dayOfWeek"
                            position="insideLeft"
                            offset={8}
                            className="fill-(--color-label)"
                            fontSize={14}
                            fontWeight={600}
                        />
                        <LabelList
                            dataKey="averageCups"
                            position="right"
                            offset={8}
                            className="fill-foreground"
                            fontSize={12}
                            formatter={(val: number) => Math.round(val)}
                        />
                        {dayOfWeekChartData.map((entry) => (
                            <Cell
                                key={entry.dayOfWeek}
                                fill={
                                    entry.dayOfWeek === bestDay?.dayOfWeek
                                        ? "url(#peakBarGradient)"
                                        : "#4b5563"
                                }
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ChartContainer>
        </div>
    );
}
