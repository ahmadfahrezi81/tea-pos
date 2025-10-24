// // dashboard/analytics/hooks/useAnalyticsFilters.ts
// import { useState, useMemo } from "react";
// import { DailySummary, AnalyticsSummary } from "../types/analytics";

// export const useAnalyticsFilters = (summaries: DailySummary[]) => {
//     const [selectedMonth, setSelectedMonth] = useState<string>(
//         new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
//     );

//     // Auto-select the two real stores by their IDs
//     const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([
//         "f559445e-e4be-4491-9294-8f979367b61c", // First real store ID
//         "ff319614-6f47-4991-b5c7-d5086c7f015d", // Second real store ID
//     ]);

//     const [summaryIdSearch, setSummaryIdSearch] = useState("");

//     // Filter summaries based on selected criteria
//     const filteredSummaries = useMemo(() => {
//         let filtered = [...summaries];

//         // Filter by selected stores (if any selected)
//         if (selectedStoreIds.length > 0) {
//             filtered = filtered.filter((summary) =>
//                 selectedStoreIds.includes(summary.store_id)
//             );
//         }

//         // Filter by summary ID search
//         if (summaryIdSearch.trim()) {
//             filtered = filtered.filter((summary) =>
//                 summary.id
//                     .toLowerCase()
//                     .includes(summaryIdSearch.toLowerCase().trim())
//             );
//         }

//         // Sort by date (newest first)
//         filtered.sort((a, b) => {
//             const dateA = new Date(a.date).getTime();
//             const dateB = new Date(b.date).getTime();
//             return dateB - dateA;
//         });

//         return filtered;
//     }, [summaries, selectedStoreIds, summaryIdSearch]);

//     // Calculate summary statistics
//     const summaryStats = useMemo((): AnalyticsSummary => {
//         const totalDays = filteredSummaries.length;
//         const totalSales = filteredSummaries.reduce(
//             (sum, summary) => sum + summary.total_sales,
//             0
//         );
//         const totalExpenses = filteredSummaries.reduce(
//             (sum, summary) => sum + (summary.total_expenses || 0),
//             0
//         );
//         const openDays = filteredSummaries.filter((s) => !s.closed_at).length;
//         const closedDays = filteredSummaries.filter((s) => s.closed_at).length;

//         return {
//             totalDays,
//             totalSales,
//             totalExpenses,
//             openDays,
//             closedDays,
//         };
//     }, [filteredSummaries]);

//     const clearFilters = () => {
//         setSelectedMonth(new Date().toISOString().slice(0, 7));
//         setSelectedStoreIds([
//             "f559445e-e4be-4491-9294-8f979367b61c",
//             "ff319614-6f47-4991-b5c7-d5086c7f015d",
//         ]);
//         setSummaryIdSearch("");
//     };

//     const hasActiveFilters =
//         selectedMonth !== new Date().toISOString().slice(0, 7) ||
//         selectedStoreIds.length !== 2 ||
//         summaryIdSearch.trim() !== "";

//     return {
//         selectedMonth,
//         setSelectedMonth,
//         selectedStoreIds,
//         setSelectedStoreIds,
//         summaryIdSearch,
//         setSummaryIdSearch,
//         filteredSummaries,
//         summaryStats,
//         clearFilters,
//         hasActiveFilters,
//     };
// };

// dashboard/analytics/hooks/useAnalyticsFilters.ts
import { useState, useMemo } from "react";
import { DailySummary, AnalyticsSummary } from "../types/analytics";

export const useAnalyticsFilters = (summaries: DailySummary[]) => {
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
    );

    // No default store selection - will be set by parent component
    const [selectedStoreId, setSelectedStoreId] = useState<string>("");

    const [summaryIdSearch, setSummaryIdSearch] = useState("");

    // Filter summaries based on selected criteria
    const filteredSummaries = useMemo(() => {
        let filtered = [...summaries];

        // Always filter by selected store (summaries should already be filtered by store from the API call)
        // This is mainly for safety and summary ID search functionality
        if (selectedStoreId) {
            filtered = filtered.filter(
                (summary) => summary.store_id === selectedStoreId
            );
        }

        // Filter by summary ID search
        if (summaryIdSearch.trim()) {
            filtered = filtered.filter((summary) =>
                summary.id
                    .toLowerCase()
                    .includes(summaryIdSearch.toLowerCase().trim())
            );
        }

        // Sort by date (newest first)
        filtered.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
        });

        return filtered;
    }, [summaries, selectedStoreId, summaryIdSearch]);

    // Calculate summary statistics
    const summaryStats = useMemo((): AnalyticsSummary => {
        const totalDays = filteredSummaries.length;
        const totalSales = filteredSummaries.reduce(
            (sum, summary) => sum + (summary.total_sales || 0),
            0
        );
        const totalExpenses = filteredSummaries.reduce(
            (sum, summary) => sum + (summary.total_expenses || 0),
            0
        );
        const openDays = filteredSummaries.filter((s) => !s.closed_at).length;
        const closedDays = filteredSummaries.filter((s) => s.closed_at).length;

        return {
            totalDays,
            totalSales,
            totalExpenses,
            openDays,
            closedDays,
        };
    }, [filteredSummaries]);

    const clearFilters = () => {
        setSelectedMonth(new Date().toISOString().slice(0, 7));
        // Don't clear store selection as it's required
        setSummaryIdSearch("");
    };

    // Only consider month and search as active filters, not store selection
    const hasActiveFilters =
        selectedMonth !== new Date().toISOString().slice(0, 7) ||
        summaryIdSearch.trim() !== "";

    return {
        selectedMonth,
        setSelectedMonth,
        selectedStoreId,
        setSelectedStoreId,
        summaryIdSearch,
        setSummaryIdSearch,
        filteredSummaries,
        summaryStats,
        clearFilters,
        hasActiveFilters,
    };
};
