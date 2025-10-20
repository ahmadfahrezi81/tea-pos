// app/[tenantSlug]/admin/[storeId]/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { DateRangePickerWithPresets } from "../_components/date-range-picker-with-presets";
import TabsOrdersChart from "../_components/charts/tabs-orders-chart";
import MetricCards from "../_components/charts/metric-cards";
import { DateRange } from "react-day-picker";
import useAdminMetrics from "@/lib/hooks/analytics/useAdminMetrics";
import useAdminTimeline from "@/lib/hooks/analytics/useAdminTimeline";
import { format } from "date-fns";
import { ScopeBadge } from "../_components/scope-badge";
import { useStoreScope } from "../StoreScopeProvider";

export default function StoreDashboardPage() {
    // Get storeId from the URL via StoreScopeProvider
    const { storeId, storeName } = useStoreScope();

    // Default to today
    const today = new Date();

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: today,
        to: today,
    });

    // Format dates for API calls
    const dateFrom = dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : "";
    const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

    // Create selectedStoreIds array with just this store
    const selectedStoreIds = useMemo(
        () => (storeId ? [storeId] : []),
        [storeId]
    );

    // Fetch data using custom hooks — pass single store in array
    const {
        data: metricsData,
        isLoading: metricsLoading,
        error: metricsError,
    } = useAdminMetrics(dateFrom, dateTo, selectedStoreIds);

    const {
        data: timelineData,
        isLoading: timelineLoading,
        error: timelineError,
    } = useAdminTimeline(dateFrom, dateTo, selectedStoreIds);

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
    };

    return (
        <div className="space-y-6 p-8">
            {/* Scope Badge */}
            <ScopeBadge />

            <header className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {storeName || "Store Dashboard"}
                    </h1>
                    <p className="text-muted-foreground">
                        Performance metrics and analytics for this store
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePickerWithPresets
                        initialRange={dateRange}
                        onChange={handleDateRangeChange}
                        className="w-[280px]"
                    />
                </div>
            </header>

            <MetricCards
                data={metricsData}
                dateFrom={dateFrom}
                dateTo={dateTo}
                isLoading={metricsLoading}
                error={metricsError}
            />

            <TabsOrdersChart
                data={timelineData}
                isLoading={timelineLoading}
                error={timelineError}
            />
        </div>
    );
}
