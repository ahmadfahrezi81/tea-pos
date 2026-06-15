"use client";
import { useMemo } from "react";
import useProductSales from "@/lib/hooks/analytics/useProductSales";
import type { ProductSalesDataPoint } from "@tea-pos/features/analytics/schema";
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
            productSales.map((item: ProductSalesDataPoint, index: number) => ({
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
        <div className="bg-white rounded-2xl p-4">
            <div className="mb-4">
                <h3 className="font-semibold text-gray-800 text-lg">
                    Product Sales
                </h3>
                <p className="text-sm text-gray-400">
                    Breakdown by product for the month
                </p>
            </div>
            <div className="space-y-4 mb-4">
                {productChartData.map((product: any) => (
                    <div key={product.productId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-800">
                                {product.productName}
                            </span>
                            <span className="text-gray-500">
                                {product.quantity} cups (
                                {product.percentage}%)
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded h-4">
                            <div
                                className="h-4 rounded transition-all"
                                style={{
                                    width: `${product.percentage}%`,
                                    backgroundColor: product.fill,
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-2 text-sm pt-3 border-t border-gray-100">
                <div className="flex gap-2 leading-none font-medium text-gray-800">
                    <Package className="h-4 w-4 shrink-0" />
                    {productChartData.length} products sold this month
                </div>
                <div className="text-gray-500 leading-none">
                    Total: {totalProductQuantity} cups
                </div>
            </div>
        </div>
    );
}
