// lib/hooks/analytics/useHourlySales.ts
import useSWR from "swr";

export interface HourlySalesData {
    hour: string; // Format: "HH:00" (e.g., "07:00", "14:00")
    cups: number;
}

interface UseHourlySalesParams {
    storeId: string | null;
    date: string; // Format: YYYY-MM-DD
}

const fetchHourlySales = async ({
    storeId,
    date,
}: UseHourlySalesParams): Promise<HourlySalesData[]> => {
    if (!storeId || !date) return [];

    const params = new URLSearchParams();
    params.append("storeId", storeId);
    params.append("date", date);

    const res = await fetch(`/api/analytics/hourly-sales?${params.toString()}`);

    if (!res.ok) {
        let errMsg = `Failed to fetch hourly sales: ${res.status}`;
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

export default function useHourlySales(storeId: string | null, date: string) {
    const key = storeId && date ? `hourly-sales-${storeId}-${date}` : null;

    return useSWR<HourlySalesData[]>(
        key,
        () => fetchHourlySales({ storeId, date }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    );
}
