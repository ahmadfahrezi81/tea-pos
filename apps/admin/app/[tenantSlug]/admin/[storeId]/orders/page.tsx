//app/[tenantSlug]/admin/[storeId]/orders/page.tsx

"use client";

import { useState, useMemo } from "react";
import { useTenant } from "../../../TenantProvider";
import useOrdersList from "@/lib/client/hooks/orders/useOrdersList";
import { DataTable } from "../../orders/_components/data-table";
import { createColumns } from "../../orders/_components/columns";
import { DateSelector } from "../../orders/_components/date-selector";
import { OrderListItem } from "@/lib/shared/schemas/order-list";
import { format } from "date-fns";
import { OrderMetrics } from "../../orders/_components/order-metrics";
import { ScopeBadge } from "../../_components/scope-badge";
import { useStoreScope } from "../../StoreScopeProvider";

export default function StoreOrdersPage() {
    const { tenantId } = useTenant();
    const { storeId, storeName } = useStoreScope();

    // ──────────────────────────────
    // State management
    // ──────────────────────────────
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // ──────────────────────────────
    // Fetch orders
    // ──────────────────────────────
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    const {
        data: orders,
        error: ordersError,
        isLoading: ordersLoading,
    } = useOrdersList(
        storeId ? [storeId] : [],
        formattedDate,
        selectedProductIds,
    );

    // ──────────────────────────────
    // Derive available products for filter
    // ──────────────────────────────
    const availableProducts = useMemo(() => {
        if (!orders) return [];
        const productMap = new Map<string, string>();
        orders.forEach((order) => {
            order.items.forEach((item) => {
                if (item.productId && item.product?.name) {
                    productMap.set(item.productId, item.product.name);
                }
            });
        });
        return Array.from(productMap.entries()).map(([id, name]) => ({
            id,
            name,
        }));
    }, [orders]);

    // ──────────────────────────────
    // Handlers
    // ──────────────────────────────
    const handleViewOrder = (order: OrderListItem) => {
        // TODO: Implement order detail modal or drawer
        console.log("View order:", order);
    };

    const handleDeleteOrder = (order: OrderListItem) => {
        // TODO: Implement delete confirmation + API call
        console.log("Delete order:", order);
    };

    const columns = createColumns(handleViewOrder, handleDeleteOrder);

    // ──────────────────────────────
    // Loading / Error / Empty states
    // ──────────────────────────────
    if (!tenantId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Tenant Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        Please select a tenant to view orders.
                    </p>
                </div>
            </div>
        );
    }

    if (!storeId) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">No Store Selected</h2>
                    <p className="text-muted-foreground mt-2">
                        This page requires a store context.
                    </p>
                </div>
            </div>
        );
    }

    if (ordersLoading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-4">
                        Loading orders...
                    </p>
                </div>
            </div>
        );
    }

    if (ordersError) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-500">Error</h2>
                    <p className="text-muted-foreground mt-2">
                        {ordersError.message}
                    </p>
                </div>
            </div>
        );
    }

    // ──────────────────────────────
    // Main UI
    // ──────────────────────────────
    return (
        <div className="space-y-6 p-8 pt-6">
            {/* Scope Tagging */}
            <ScopeBadge />

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold">
                        Orders {storeName && `– ${storeName}`}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View and manage orders for this store.
                    </p>
                </div>
                <div className="flex gap-2">
                    <DateSelector
                        date={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                </div>
            </div>

            {/* Order Metrics */}
            {orders && orders.length > 0 && <OrderMetrics orders={orders} />}

            {/* Orders Table */}
            {!orders || orders.length === 0 ? (
                <div className="flex items-center justify-center h-[40vh]">
                    <p className="text-muted-foreground">
                        No orders found for this date or filters.
                    </p>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={orders}
                    availableProducts={availableProducts}
                    selectedProductIds={selectedProductIds}
                    onSelectionChange={setSelectedProductIds}
                />
            )}
        </div>
    );
}
