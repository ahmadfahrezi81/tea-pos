import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Package } from "lucide-react";

interface ProductData {
    name: string;
    cups: number;
    percentage: number;
    color: string;
}

// Sample product data - replace with your actual data
const sampleProductData: ProductData[] = [
    { name: "Jeruk", cups: 62, percentage: 36.5, color: "#ef4444" },
    { name: "Mangga", cups: 23, percentage: 13.5, color: "#f97316" },
    { name: "Jambu", cups: 19, percentage: 11.2, color: "#eab308" },
    { name: "Original", cups: 14, percentage: 8.2, color: "#84cc16" },
    { name: "Leci", cups: 13, percentage: 7.6, color: "#22c55e" },
];

export default function ProductSalesBreakdown({
    data = sampleProductData,
}: {
    data?: ProductData[];
}) {
    const totalCups = data.reduce((sum, product) => sum + product.cups, 0);
    const totalProducts = data.length;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Top 5 Product Sales</CardTitle>
                <CardDescription>
                    Breakdown by product for the month
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Product list */}
                <div className="space-y-3">
                    {data.map((product) => (
                        <div key={product.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: product.color,
                                        }}
                                    />
                                    <span className="font-medium">
                                        {product.name}
                                    </span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {product.cups} cups ({product.percentage}%)
                                </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full transition-all"
                                    style={{
                                        width: `${product.percentage}%`,
                                        backgroundColor: product.color,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary footer */}
                <div className="pt-4 border-t space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">
                            {totalProducts} products sold this month
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Total: {totalCups} cups
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
