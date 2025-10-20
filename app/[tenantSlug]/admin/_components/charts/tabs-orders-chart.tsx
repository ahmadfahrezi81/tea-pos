import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { AdminTimelineResponse } from "@/lib/schemas/analytics";

const chartConfig = {
    orders: {
        label: "Orders",
        color: "#175EFA",
    },
    cups: {
        label: "Cups",
        color: "#175EFA",
    },
};

export default function TabsOrdersChart({
    data,
    isLoading = false,
    error,
}: {
    data?: AdminTimelineResponse;
    isLoading?: boolean;
    error?: Error;
}) {
    const [activeTab, setActiveTab] = useState("orders");

    const getTitle = () => {
        return activeTab === "orders" ? "Total Orders" : "Cups Sold";
    };

    const getDescription = () => {
        if (!data) return "Loading...";

        if (data.granularity === "hourly") {
            return activeTab === "orders"
                ? "Hourly orders trend for selected day"
                : "Number of cups sold each hour";
        }

        return activeTab === "orders"
            ? "Daily orders trend for selected period"
            : "Number of cups sold each day";
    };

    const formatXAxisLabel = (label: string) => {
        if (!data) return label;

        if (data.granularity === "hourly") {
            return label; // Already in HH:00 format
        }

        // Format date as "DD MMM"
        const date = new Date(label);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    if (error) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
                <CardContent>
                    <p className="text-sm text-destructive">
                        Failed to load chart: {error.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading || !data) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Loading...</CardTitle>
                        <CardDescription>Fetching chart data</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    // Filter out data points with no activity for hourly view
    const filteredData =
        data.granularity === "hourly"
            ? data.data.filter((item) => item.orders > 0 || item.cups > 0)
            : data.data;

    // Transform data for recharts
    const chartData = filteredData.map((item) => ({
        date: formatXAxisLabel(item.label),
        originalLabel: item.label,
        orders: item.orders,
        cups: item.cups,
    }));

    // Calculate dynamic Y-axis domain
    const values = chartData.map(
        (item) => item[activeTab as keyof typeof item]
    );
    const maxValue = Math.max(...(values as number[]));
    const minValue = Math.min(...(values as number[]));

    // Add 10% padding to min/max, but ensure min doesn't go below 0
    const padding = (maxValue - minValue) * 0.1;
    const yAxisMin = Math.max(0, Math.floor(minValue - padding));
    const yAxisMax = Math.ceil(maxValue + padding);

    // Custom label component to show value on each point
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomLabel = (props: any) => {
        const { x, y, value } = props;
        return (
            <text
                x={x}
                y={y - 10}
                fill="#666"
                textAnchor="middle"
                fontSize={11}
                fontWeight={500}
            >
                {value}
            </text>
        );
    };

    return (
        <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-xl">{getTitle()}</CardTitle>
                    <CardDescription>{getDescription()}</CardDescription>
                </div>
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-auto"
                >
                    <TabsList className="h-9">
                        <TabsTrigger value="orders" className="text-xs">
                            Orders
                        </TabsTrigger>
                        <TabsTrigger value="cups" className="text-xs">
                            Cups
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={chartConfig}
                    className="h-[300px] w-full"
                >
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient
                                id="colorOrders"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#175EFA"
                                    stopOpacity={0.6}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#175EFA"
                                    stopOpacity={0.05}
                                />
                            </linearGradient>
                            <linearGradient
                                id="colorCups"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="5%"
                                    stopColor="#175EFA"
                                    stopOpacity={0.6}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="#175EFA"
                                    stopOpacity={0.05}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            angle={
                                data.granularity === "daily" &&
                                chartData.length > 7
                                    ? -45
                                    : 0
                            }
                            textAnchor={
                                data.granularity === "daily" &&
                                chartData.length > 7
                                    ? "end"
                                    : "middle"
                            }
                            height={
                                data.granularity === "daily" &&
                                chartData.length > 7
                                    ? 60
                                    : 30
                            }
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            domain={[yAxisMin, yAxisMax]}
                            allowDataOverflow={false}
                        />
                        <ChartTooltip
                            content={<ChartTooltipContent />}
                            cursor={{
                                stroke: "#175EFA",
                                strokeWidth: 1,
                                strokeDasharray: "5 5",
                            }}
                        />
                        <Area
                            type="linear"
                            dataKey={activeTab}
                            stroke={`var(--color-${activeTab})`}
                            strokeWidth={3}
                            fill={
                                activeTab === "orders"
                                    ? "url(#colorOrders)"
                                    : "url(#colorCups)"
                            }
                            dot={{
                                strokeWidth: 2,
                                r: 5,
                                fill: "#fff",
                                fillOpacity: 100,
                            }}
                            activeDot={{ r: 6, strokeWidth: 2 }}
                            label={<CustomLabel />}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
