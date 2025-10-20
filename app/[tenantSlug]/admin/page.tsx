// // //app/[tenantSlug]/admin/page.tsx

// // "use client";

// // import React from "react";
// // import { DateRangePickerWithPresets } from "./_components/date-range-picker-with-presets";
// // import TabsOrdersChart from "./_components/charts/tabs-orders-chart";
// // import StoreSalesBreakdownChart from "./_components/charts/store-sales-breakdown-chart";
// // import RecentOrdersTable from "./_components/charts/recent-orders-table";
// // import MetricCards from "./_components/charts/metric-cards";

// // // ---------------------------------------------------------------------------
// // // Main Dashboard
// // // ---------------------------------------------------------------------------

// // export default function AdminDashboard() {
// //     return (
// //         <div className="space-y-6 p-8">
// //             <header className="flex items-start justify-between">
// //                 <div>
// //                     <h1 className="text-3xl font-bold tracking-tight">
// //                         Admin Dashboard
// //                     </h1>
// //                     <p className="text-muted-foreground">
// //                         Overview of all stores and performance metrics
// //                     </p>
// //                 </div>
// //                 <div>
// //                     <DateRangePickerWithPresets
// //                         onChange={(range) => console.log(range)}
// //                         className="w-[280px]"
// //                     />
// //                 </div>
// //             </header>

// //             <MetricCards />

// //             <TabsOrdersChart />

// //             {/* Tables & Store Breakdown */}
// //             <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
// //                 <div className="lg:col-span-2">
// //                     <RecentOrdersTable />
// //                 </div>

// //                 <StoreSalesBreakdownChart />
// //             </div>
// //         </div>
// //     );
// // }

// //app/[tenantSlug]/admin/page.tsx

// "use client";

// import React, { useState } from "react";
// import { DateRangePickerWithPresets } from "./_components/date-range-picker-with-presets";
// import TabsOrdersChart from "./_components/charts/tabs-orders-chart";
// import StoreSalesBreakdownChart from "./_components/charts/store-sales-breakdown-chart";
// import RecentOrdersTable from "./_components/charts/recent-orders-table";
// import MetricCards from "./_components/charts/metric-cards";
// import { DateRange } from "react-day-picker";
// import useAdminMetrics from "@/lib/hooks/analytics/useAdminMetrics";
// import useAdminTimeline from "@/lib/hooks/analytics/useAdminTimeline";
// import useAdminStoreBreakdown from "@/lib/hooks/analytics/useAdminStoreBreakdown";
// import useRecentOrders from "@/lib/hooks/analytics/useRecentOrders";
// import { format, subDays } from "date-fns";

// // ---------------------------------------------------------------------------
// // Main Dashboard
// // ---------------------------------------------------------------------------

// export default function AdminDashboard() {
//     // Default to last 7 days
//     const today = new Date();
//     const weekAgo = subDays(today, 6);

//     const [dateRange, setDateRange] = useState<DateRange | undefined>({
//         from: weekAgo,
//         to: today,
//     });

//     // Format dates for API calls
//     const dateFrom = dateRange?.from
//         ? format(dateRange.from, "yyyy-MM-dd")
//         : "";
//     const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

//     // Fetch all data using custom hooks
//     const {
//         data: metricsData,
//         isLoading: metricsLoading,
//         error: metricsError,
//     } = useAdminMetrics(dateFrom, dateTo);

//     const {
//         data: timelineData,
//         isLoading: timelineLoading,
//         error: timelineError,
//     } = useAdminTimeline(dateFrom, dateTo);

//     const {
//         data: storeBreakdownData,
//         isLoading: storeBreakdownLoading,
//         error: storeBreakdownError,
//     } = useAdminStoreBreakdown(dateFrom, dateTo);

//     const {
//         data: recentOrdersData,
//         isLoading: recentOrdersLoading,
//         error: recentOrdersError,
//     } = useRecentOrders(dateFrom, dateTo);

//     const handleDateRangeChange = (range: DateRange | undefined) => {
//         setDateRange(range);
//     };

//     return (
//         <div className="space-y-6 p-8">
//             <header className="flex items-start justify-between">
//                 <div>
//                     <h1 className="text-3xl font-bold tracking-tight">
//                         Admin Dashboard
//                     </h1>
//                     <p className="text-muted-foreground">
//                         Overview of all stores and performance metrics
//                     </p>
//                 </div>
//                 <div>
//                     <DateRangePickerWithPresets
//                         initialRange={dateRange}
//                         onChange={handleDateRangeChange}
//                         className="w-[280px]"
//                     />
//                 </div>
//             </header>

//             <MetricCards
//                 data={metricsData}
//                 dateFrom={dateFrom}
//                 dateTo={dateTo}
//                 isLoading={metricsLoading}
//                 error={metricsError}
//             />

//             <TabsOrdersChart
//                 data={timelineData}
//                 isLoading={timelineLoading}
//                 error={timelineError}
//             />

//             {/* Tables & Store Breakdown */}
//             <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
//                 <div className="lg:col-span-2">
//                     <RecentOrdersTable
//                         orders={recentOrdersData}
//                         isLoading={recentOrdersLoading}
//                         error={recentOrdersError}
//                     />
//                 </div>

//                 <StoreSalesBreakdownChart
//                     data={storeBreakdownData}
//                     isLoading={storeBreakdownLoading}
//                     error={storeBreakdownError}
//                 />
//             </div>
//         </div>
//     );
// }

//app/[tenantSlug]/admin/page.tsx

//app/[tenantSlug]/admin/page.tsx

"use client";

import React, { useState } from "react";
import { DateRangePickerWithPresets } from "./_components/date-range-picker-with-presets";
import TabsOrdersChart from "./_components/charts/tabs-orders-chart";
import StoreSalesBreakdownChart from "./_components/charts/store-sales-breakdown-chart";
import RecentOrdersTable from "./_components/charts/recent-orders-table";
import MetricCards from "./_components/charts/metric-cards";
import { DateRange } from "react-day-picker";
import useAdminMetrics from "@/lib/hooks/analytics/useAdminMetrics";
import useAdminTimeline from "@/lib/hooks/analytics/useAdminTimeline";
import useAdminStoreBreakdown from "@/lib/hooks/analytics/useAdminStoreBreakdown";
import useRecentOrders from "@/lib/hooks/analytics/useRecentOrders";
import { format } from "date-fns";
import { ScopeBadge } from "./_components/scope-badge";

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
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

    // Fetch all data using custom hooks
    const {
        data: metricsData,
        isLoading: metricsLoading,
        error: metricsError,
    } = useAdminMetrics(dateFrom, dateTo);

    const {
        data: timelineData,
        isLoading: timelineLoading,
        error: timelineError,
    } = useAdminTimeline(dateFrom, dateTo);

    const {
        data: storeBreakdownData,
        isLoading: storeBreakdownLoading,
        error: storeBreakdownError,
    } = useAdminStoreBreakdown(dateFrom, dateTo);

    const {
        data: recentOrdersData,
        isLoading: recentOrdersLoading,
        error: recentOrdersError,
    } = useRecentOrders();

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
    };

    return (
        <div className="space-y-6 p-8">
            {/* Scope Tagging */}
            <ScopeBadge />
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Overview of all stores and performance metrics
                    </p>
                </div>
                <div>
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

            {/* Tables & Store Breakdown */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <RecentOrdersTable
                        orders={recentOrdersData}
                        isLoading={recentOrdersLoading}
                        error={recentOrdersError}
                    />
                </div>

                <StoreSalesBreakdownChart
                    data={storeBreakdownData}
                    isLoading={storeBreakdownLoading}
                    error={storeBreakdownError}
                />
            </div>
        </div>
    );
}
