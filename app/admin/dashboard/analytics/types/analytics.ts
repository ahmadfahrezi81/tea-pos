// dashboard/analytics/types/analytics.ts
export interface DailySummary {
    id: string;
    store_id: string;
    seller_id: string;
    manager_id: string | null;
    date: string;
    opening_balance: number;
    total_sales: number;
    expected_cash: number;
    actual_cash: number | null;
    variance: number | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
    total_expenses: number;
    stores?: { name: string };
    seller?: { full_name: string };
    expenses?: Expense[];
}

export interface Expense {
    id: string;
    daily_summary_id: string;
    expense_type: string;
    amount: number;
    created_at: string;
}

export interface Store {
    id: string;
    name: string;
}

export interface ProductBreakdown {
    [productName: string]: {
        quantity: number;
        total: number;
    };
}

export interface Order {
    id: string;
    store_id: string;
    total_amount: number;
    created_at: string;
}

export interface MonthlyTotals {
    totalOrders: number;
    totalCups: number;
    totalSales: number;
    totalExpenses: number;
}

export interface AnalyticsData {
    summaries: DailySummary[];
    monthlyTotals: MonthlyTotals;
    productBreakdown: { [date: string]: ProductBreakdown };
    ordersByDate: { [date: string]: Order[] };
    expensesByDate: { [date: string]: Expense[] };
}

export interface AnalyticsSummary {
    totalDays: number;
    totalSales: number;
    totalExpenses: number;
    openDays: number;
    closedDays: number;
}
