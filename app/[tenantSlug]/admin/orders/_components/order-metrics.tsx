// app/[tenantSlug]/admin/orders/_components/order-metrics.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Coffee, TrendingUp, DollarSign } from "lucide-react";
import { OrderListItem } from "@/lib/schemas/order-list";

interface OrderMetricsProps {
    orders: OrderListItem[];
}

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount);
};

const formatNumber = (num: number): string => {
    return new Intl.NumberFormat("id-ID").format(num);
};

export function OrderMetrics({ orders }: OrderMetricsProps) {
    // Calculate metrics
    const totalOrders = orders.length;
    const totalCups = orders.reduce(
        (sum, order) => sum + order.totalQuantity,
        0
    );
    const totalSales = orders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
    );
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const metrics = [
        {
            title: "Total Orders",
            value: formatNumber(totalOrders),
            icon: ShoppingCart,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-950",
        },
        {
            title: "Total Cups",
            value: formatNumber(totalCups),
            icon: Coffee,
            color: "text-amber-600",
            bgColor: "bg-amber-50 dark:bg-amber-950",
        },
        {
            title: "Total Sales",
            value: formatCurrency(totalSales),
            icon: TrendingUp,
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-950",
        },
        {
            title: "Average Order Value",
            value: formatCurrency(averageOrderValue),
            icon: DollarSign,
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-950",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                    <Card
                        key={index}
                        className="overflow-hidden p-0 rounded-lg shadow-none"
                    >
                        <CardContent className="p-5 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {metric.title}
                                    </p>
                                    <h3 className="text-2xl font-bold mt-2">
                                        {metric.value}
                                    </h3>
                                </div>
                                <div
                                    className={`p-3 rounded-full ${metric.bgColor}`}
                                >
                                    <Icon
                                        className={`h-6 w-6 ${metric.color}`}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
