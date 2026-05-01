import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderItem {
    quantity: number;
    product: {
        name: string;
    } | null;
}

interface Order {
    id: string;
    store: string;
    seller: string;
    items: OrderItem[];
    time: string;
}

export default function RecentOrdersTable({
    orders = [],
    itemsPerPage = 5,
    isLoading = false,
    error,
}: {
    orders?: Order[];
    itemsPerPage?: number;
    isLoading?: boolean;
    error?: Error;
}) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOrders = orders.slice(startIndex, endIndex);

    const handlePrevious = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNext = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    };

    if (error) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-1">
                <CardContent>
                    <p className="text-sm text-destructive">
                        Failed to load orders: {error.message}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-1">
                <CardHeader className="gap-0">
                    <CardTitle className="text-xl">Recent Orders</CardTitle>
                    <CardDescription>Loading orders...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="h-64 bg-muted animate-pulse rounded" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (orders.length === 0) {
        return (
            <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-1">
                <CardHeader className="gap-0">
                    <CardTitle className="text-xl">Recent Orders</CardTitle>
                    <CardDescription>No orders found</CardDescription>
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
        <Card className="w-full shadow-none py-5 [&>*]:px-5 gap-1">
            <CardHeader className="gap-0">
                <CardTitle className="text-xl">Recent Orders</CardTitle>
                <CardDescription className="pb-2">
                    Latest orders across all stores
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="rounded-md border">
                        <table className="w-full">
                            <thead className="text-sm">
                                <tr className="border-b bg-muted/50">
                                    <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                                        Order ID
                                    </th>
                                    <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                                        Store
                                    </th>
                                    <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                                        Seller
                                    </th>
                                    <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                                        Items
                                    </th>
                                    <th className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {currentOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b transition-colors hover:bg-muted/50"
                                    >
                                        <td className="p-3 align-middle font-mono text-xs">
                                            ORD-
                                            {order.id.slice(0, 4).toUpperCase()}
                                        </td>
                                        <td className="p-3 align-middle">
                                            {order.store}
                                        </td>
                                        <td className="p-3 align-middle">
                                            {order.seller}
                                        </td>
                                        <td className="p-3 align-middle">
                                            {order.items.length === 0 ? (
                                                <span className="text-muted-foreground text-sm">
                                                    —
                                                </span>
                                            ) : (
                                                <div className="flex flex-wrap gap-1">
                                                    {order.items.map(
                                                        (item, idx) => (
                                                            <Badge
                                                                key={idx}
                                                                variant="outline"
                                                                className="text-xs px-1.5 py-0 font-normal"
                                                            >
                                                                {item.quantity}×{" "}
                                                                {item.product
                                                                    ?.name ||
                                                                    "Unknown"}
                                                            </Badge>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 align-middle text-sm">
                                            {order.time}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {startIndex + 1}-
                            {Math.min(endIndex, orders.length)} of{" "}
                            {orders.length} orders
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrevious}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNext}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
