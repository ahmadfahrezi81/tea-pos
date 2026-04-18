// lib/hooks/analytics/useDailySales.ts
import useSWR from "swr";

export interface DailySalesData {
    date: string; // Format: "YYYY-MM-DD" (e.g., "2025-10-15")
    cups: number;
}

interface UseDailySalesParams {
    storeId: string | null;
    month: string; // Format: YYYY-MM
}

const fetchDailySales = async ({
    storeId,
    month,
}: UseDailySalesParams): Promise<DailySalesData[]> => {
    if (!storeId || !month) return [];

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    params.append("month", month);

    const res = await fetch(`/api/analytics/daily-sales?${params.toString()}`);

    if (!res.ok) {
        let errMsg = `Failed to fetch daily sales: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    // API returns { data: [...] }
    return json.data || [];
};

export default function useDailySales(storeId: string | null, month: string) {
    const key = storeId && month ? `daily-sales-${storeId}-${month}` : null;

    return useSWR<DailySalesData[]>(
        key,
        () => fetchDailySales({ storeId, month }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 900000, // 5 min
            refreshInterval: 0, //Disable polling (this assumes daily sales are not changing every second)
            keepPreviousData: true,
        }
    );
}
