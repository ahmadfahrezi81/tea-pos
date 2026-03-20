"use client";
import { useMemo } from "react";
import useProductSales from "@/lib/hooks/analytics/useProductSales";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

const generateColor = (index: number, total: number) => {
    const hue = (index * 360) / total;
    return `hsl(${hue}, 70%, 55%)`;
};

interface Props {
    storeId: string;
    month: string; // YYYY-MM
}

export default function ProductSalesChart({ storeId, month }: Props) {
    const { data: productSalesData, isLoading } = useProductSales(
        storeId,
        month,
    );

    const productSales = useMemo(
        () => productSalesData?.data ?? [],
        [productSalesData],
    );
    const totalProductQuantity = productSalesData?.totalQuantity ?? 0;

    const productChartData = useMemo(
        () =>
            productSales.map((item, index) => ({
                ...item,
                fill: generateColor(index, productSales.length),
            })),
        [productSales],
    );

    if (isLoading) {
        return (
            <div
                className="bg-gray-200 rounded-xl animate-pulse relative"
                style={{ height: 300 }}
            >
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (productChartData.length === 0) return null;

    return (
        <Card className="py-4 gap-4 [&>*]:px-4">
            <CardHeader>
                <CardTitle>Product Sales</CardTitle>
                <CardDescription>
                    Breakdown by product for the month
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {productChartData.map((product) => (
                        <div key={product.productId} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-sm"
                                        style={{
                                            backgroundColor: product.fill,
                                        }}
                                    />
                                    <span className="font-medium">
                                        {product.productName}
                                    </span>
                                </div>
                                <span className="text-muted-foreground">
                                    {product.quantity} cups (
                                    {product.percentage}%)
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                        width: `${product.percentage}%`,
                                        backgroundColor: product.fill,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 leading-none font-medium">
                    <Package className="h-4 w-4" />
                    {productChartData.length} products sold this month
                </div>
                <div className="text-muted-foreground leading-none">
                    Total: {totalProductQuantity} cups
                </div>
            </CardFooter>
        </Card>
    );
}
