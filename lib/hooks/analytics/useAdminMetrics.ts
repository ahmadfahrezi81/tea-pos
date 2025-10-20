// lib/hooks/analytics/useAdminMetrics.ts
import useSWR from "swr";
import { AdminMetricsResponse } from "@/lib/schemas/analytics";

interface UseAdminMetricsParams {
    dateFrom: string; // YYYY-MM-DD
    dateTo: string; // YYYY-MM-DD
}

const fetchAdminMetrics = async ({
    dateFrom,
    dateTo,
}: UseAdminMetricsParams): Promise<AdminMetricsResponse> => {
    if (!dateFrom || !dateTo) {
        throw new Error("Date range is required");
    }

    const params = new URLSearchParams();
    params.append("dateFrom", dateFrom);
    params.append("dateTo", dateTo);

    const res = await fetch(
        `/api/analytics/admin/metrics?${params.toString()}`
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch admin metrics: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore JSON parse error
        }
        throw new Error(errMsg);
    }

    return res.json();
};

export default function useAdminMetrics(dateFrom: string, dateTo: string) {
    const key =
        dateFrom && dateTo ? `admin-metrics-${dateFrom}-${dateTo}` : null;

    return useSWR<AdminMetricsResponse>(
        key,
        () => fetchAdminMetrics({ dateFrom, dateTo }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    );
}
