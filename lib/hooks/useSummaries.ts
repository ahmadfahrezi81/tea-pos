import useSWR from "swr";

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
    stores?: { name: string };
    seller?: { full_name: string };
    manager?: { full_name: string };
}

export interface ProductBreakdown {
    [date: string]: {
        [productName: string]: {
            quantity: number;
            revenue: number;
        };
    };
}

export interface MonthlyTotals {
    totalSales: number;
    totalOrders: number;
    totalCups: number;
}

export interface SummariesData {
    summaries: DailySummary[];
    productBreakdown: ProductBreakdown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ordersByDate: { [date: string]: any[] }; // Add this line
    monthlyTotals: MonthlyTotals;
}

const fetcher = async (url: string): Promise<SummariesData> => {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error("Failed to fetch summaries");
    }
    return res.json();
};

export const useSummaries = (storeId?: string, month?: string) => {
    const { data, error, mutate } = useSWR<SummariesData>(
        storeId && month
            ? `/api/summaries?storeId=${storeId}&month=${month}`
            : null,
        fetcher,
        {
            refreshInterval: 30000, // Auto-refresh every 30 seconds
            revalidateOnFocus: true,
        }
    );

    const createSummary = async (summaryData: {
        storeId: string;
        sellerId: string;
        managerId: string;
        date: string;
        openingBalance?: number;
    }) => {
        const res = await fetch("/api/summaries", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(summaryData),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create summary");
        }

        mutate(); // Refresh data
        return res.json();
    };

    const updateSummary = async (
        id: string,
        updates: Partial<DailySummary>
    ) => {
        const res = await fetch("/api/summaries", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id, ...updates }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to update summary");
        }

        mutate(); // Refresh data
        return res.json();
    };

    return {
        data,
        isLoading: !data && !error,
        error,
        mutate,
        createSummary,
        updateSummary,
    };
};
