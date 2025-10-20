import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AdminStoreBreakdownResponse } from "@/lib/schemas/analytics";

const storeColors = [
    "#3E92CC", // Light Blue
    "#F67280", // Soft Pink
    "#C06C84", // Plum
    "#6C5B7B", // Deep Purple
    "#355C7D", // Dark Teal
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Lavender
];

export default function StoreSalesBreakdownChart({
    data,
    isLoading = false,
    error,
}: {
    data?: AdminStoreBreakdownResponse;
    isLoading?: boolean;
    error?: Error;
}) {
    if (error) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
                <CardContent>
                    <p className="text-sm text-destructive">
                        Failed to load store breakdown: {error.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading || !data) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
                <CardHeader className="gap-0">
                    <CardTitle className="text-xl">
                        Store Sales Breakdown
                    </CardTitle>
                    <CardDescription>Loading store data...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="h-3 w-full bg-muted animate-pulse rounded-full" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-12 bg-muted animate-pulse rounded"
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const storeData = data.data;
    const totalOrders = data.totalOrders;

    if (storeData.length === 0) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
                <CardHeader className="gap-0">
                    <CardTitle className="text-xl">
                        Store Sales Breakdown
                    </CardTitle>
                    <CardDescription>No data available</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No orders found for the selected period
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-4">
            <CardHeader className="gap-0">
                <CardTitle className="text-xl">Store Sales Breakdown</CardTitle>
                <CardDescription>
                    Total orders distributed across all store locations
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress bar showing all stores */}
                <div className="flex h-3 w-full overflow-hidden rounded-full">
                    {storeData.map((store, index) => (
                        <div
                            key={store.storeId}
                            style={{
                                width: `${store.percentage}%`,
                                backgroundColor:
                                    storeColors[index % storeColors.length],
                            }}
                        />
                    ))}
                </div>

                {/* Store details */}
                <div className="space-y-4">
                    {storeData.map((store, index) => (
                        <div
                            key={store.storeId}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{
                                        backgroundColor:
                                            storeColors[
                                                index % storeColors.length
                                            ],
                                    }}
                                />
                                <div>
                                    <p className="font-medium">
                                        {store.storeName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {store.orders.toLocaleString("id-ID")}{" "}
                                        orders
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full transition-all"
                                        style={{
                                            width: `${store.percentage}%`,
                                            backgroundColor:
                                                storeColors[
                                                    index % storeColors.length
                                                ],
                                        }}
                                    />
                                </div>
                                <span className="text-sm font-medium w-10 text-right">
                                    {store.percentage}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total summary */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                            Total Orders
                        </p>
                        <p className="text-2xl font-bold">
                            {totalOrders.toLocaleString("id-ID")}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
