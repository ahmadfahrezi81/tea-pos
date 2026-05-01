/* eslint-disable @typescript-eslint/no-explicit-any */
// utils/summariesHelpers.ts
// Compatible with the new summaries hook (camelCase fields)

type ProductInfo = {
    quantity?: number;
    revenue?: number;
};

type SummariesLike = {
    productBreakdown?: Record<string, Record<string, ProductInfo>>;
    ordersByDate?: Record<string, any[]>;
    expensesByDate?: Record<string, any[]>;
};

// ---------------------------------------------------------------------------
// General utilities
// ---------------------------------------------------------------------------

export const isCurrentMonthSelected = (selectedMonth: string): boolean => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return selectedMonth === currentMonth;
};

export const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year:
            date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
};

// ---------------------------------------------------------------------------
// Safe helpers (no undefined crashes, no external types)
// ---------------------------------------------------------------------------

export const getProductBreakdownForDate = (
    summariesData: SummariesLike | undefined,
    date: string
): Record<string, ProductInfo> => {
    return summariesData?.productBreakdown?.[date] ?? {};
};

export const getCupsCountForDate = (
    summariesData: SummariesLike | undefined,
    date: string
): number => {
    const breakdown = getProductBreakdownForDate(summariesData, date);
    return Object.values(breakdown).reduce((total, product) => {
        const qty = Number(product?.quantity ?? 0);
        return total + (Number.isFinite(qty) ? qty : 0);
    }, 0);
};

export const getOrdersCountForDate = (
    summariesData: SummariesLike | undefined,
    date: string
): number => {
    const orders = summariesData?.ordersByDate?.[date];
    return Array.isArray(orders) ? orders.length : 0;
};

export const getExpensesForDate = (
    summariesData: SummariesLike | undefined,
    date: string
): any[] => {
    const expenses = summariesData?.expensesByDate?.[date];
    return Array.isArray(expenses) ? expenses : [];
};
