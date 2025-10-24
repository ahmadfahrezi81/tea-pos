import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingCart,
    Store,
    CupSoda,
} from "lucide-react";
import { AdminMetricsResponse } from "@/lib/schemas/analytics";

interface MetricCardProps {
    title: string;
    value: string;
    change: string;
    icon: React.ElementType;
    trend: "up" | "down";
    periodLabel?: string;
    isLoading?: boolean;
}

function MetricCard({
    title,
    value,
    change,
    icon: Icon,
    trend,
    periodLabel = "vs last period",
    isLoading = false,
}: MetricCardProps) {
    const isPositive = trend === "up";
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    if (isLoading) {
        return (
            <Card className="py-5 [&>*]:px-5 gap-1 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                        {title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-24 bg-muted animate-pulse rounded mt-1" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="py-5 [&>*]:px-5 gap-1 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <TrendIcon
                        className={`h-3 w-3 ${
                            isPositive ? "text-green-500" : "text-red-500"
                        }`}
                    />
                    <span
                        className={
                            isPositive ? "text-green-500" : "text-red-500"
                        }
                    >
                        {change}
                    </span>
                    <span>{periodLabel}</span>
                </div>
            </CardContent>
        </Card>
    );
}

function formatRupiah(amount: number): string {
    return `Rp ${amount.toLocaleString("id-ID")}`;
}

function generatePeriodLabel(dateFrom: string, dateTo: string): string {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);

    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "vs yesterday";
    } else if (diffDays === 6) {
        return "vs last week";
    } else if (diffDays >= 28 && diffDays <= 31) {
        return "vs last month";
    } else {
        // Format as "vs Oct 11-19"
        const prevFrom = new Date(from);
        prevFrom.setDate(prevFrom.getDate() - diffDays - 1);
        const prevTo = new Date(from);
        prevTo.setDate(prevTo.getDate() - 1);

        const monthFrom = prevFrom.toLocaleDateString("en-US", {
            month: "short",
        });
        const monthTo = prevTo.toLocaleDateString("en-US", { month: "short" });
        const dayFrom = prevFrom.getDate();
        const dayTo = prevTo.getDate();

        if (monthFrom === monthTo) {
            return `vs ${monthFrom} ${dayFrom}-${dayTo}`;
        } else {
            return `vs ${monthFrom} ${dayFrom}-${monthTo} ${dayTo}`;
        }
    }
}

export default function MetricCards({
    data,
    dateFrom,
    dateTo,
    isLoading = false,
    error,
}: {
    data?: AdminMetricsResponse;
    dateFrom: string;
    dateTo: string;
    isLoading?: boolean;
    error?: Error;
}) {
    const periodLabel = generatePeriodLabel(dateFrom, dateTo);

    if (error) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="py-5 [&>*]:px-5 gap-1 shadow-none col-span-full">
                    <CardContent>
                        <p className="text-sm text-destructive">
                            Failed to load metrics: {error.message}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
                title="Total Orders"
                value={data?.totalOrders?.toLocaleString("id-ID") || "0"}
                change={`${
                    data?.ordersChange && data.ordersChange > 0 ? "+" : ""
                }${data?.ordersChange || 0}%`}
                icon={ShoppingCart}
                trend={
                    data?.ordersChange && data.ordersChange >= 0 ? "up" : "down"
                }
                periodLabel={periodLabel}
                isLoading={isLoading}
            />
            <MetricCard
                title="Cups Sold"
                value={data?.totalCups?.toLocaleString("id-ID") || "0"}
                change={`${data?.cupsChange && data.cupsChange > 0 ? "+" : ""}${
                    data?.cupsChange || 0
                }%`}
                icon={CupSoda}
                trend={data?.cupsChange && data.cupsChange >= 0 ? "up" : "down"}
                periodLabel={periodLabel}
                isLoading={isLoading}
            />
            <MetricCard
                title="Total Revenue"
                value={formatRupiah(data?.totalRevenue || 0)}
                change={`${
                    data?.revenueChange && data.revenueChange > 0 ? "+" : ""
                }${data?.revenueChange || 0}%`}
                icon={DollarSign}
                trend={
                    data?.revenueChange && data.revenueChange >= 0
                        ? "up"
                        : "down"
                }
                periodLabel={periodLabel}
                isLoading={isLoading}
            />
            <MetricCard
                title="Average Order Value"
                value={formatRupiah(data?.averageOrderValue || 0)}
                change={`${data?.aovChange && data.aovChange > 0 ? "+" : ""}${
                    data?.aovChange || 0
                }%`}
                icon={Store}
                trend={data?.aovChange && data.aovChange >= 0 ? "up" : "down"}
                periodLabel={periodLabel}
                isLoading={isLoading}
            />
        </div>
    );
}
