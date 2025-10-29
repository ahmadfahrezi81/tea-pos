import useSWR from "swr";

export interface DayOfWeekSalesData {
    dayOfWeek: string;
    dayIndex: number;
    averageCups: number;
    totalCups: number;
    occurrences: number;
}

interface UseDayOfWeekSalesParams {
    storeId: string | null;
    month: string; // Format: YYYY-MM
}

interface DayOfWeekSalesResponse {
    data: DayOfWeekSalesData[];
}

const fetchDayOfWeekSales = async ({
    storeId,
    month,
}: UseDayOfWeekSalesParams): Promise<DayOfWeekSalesResponse> => {
    if (!storeId || !month) {
        return { data: [] };
    }

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    params.append("month", month);

    const res = await fetch(
        `/api/analytics/day-of-week-sales?${params.toString()}`
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch day-of-week sales: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    const json = await res.json();
    return json;
};

export default function useDayOfWeekSales(
    storeId: string | null,
    month: string
) {
    const key =
        storeId && month ? `day-of-week-sales-${storeId}-${month}` : null;

    return useSWR<DayOfWeekSalesResponse>(
        key,
        () => fetchDayOfWeekSales({ storeId, month }),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 min
            refreshInterval: 0,
            keepPreviousData: true,
        }
    );
}
