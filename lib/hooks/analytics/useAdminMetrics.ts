// lib/hooks/analytics/useAdminMetrics.ts
import useSWR from "swr";
import { AdminMetricsResponse } from "@/lib/schemas/analytics";

interface UseAdminMetricsParams {
    dateFrom: string; // YYYY-MM-DD
    dateTo: string; // YYYY-MM-DD
    storeIds?: string[]; // optional filter
}

const fetchAdminMetrics = async ({
    dateFrom,
    dateTo,
    storeIds,
}: UseAdminMetricsParams): Promise<AdminMetricsResponse> => {
    if (!dateFrom || !dateTo) {
        throw new Error("Date range is required");
    }

    const params = new URLSearchParams();
    params.append("dateFrom", dateFrom);
    params.append("dateTo", dateTo);
    if (storeIds && storeIds.length > 0) {
        params.append("storeIds", storeIds.join(","));
    }

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

export default function useAdminMetrics(
    dateFrom: string,
    dateTo: string,
    storeIds?: string[]
) {
    const key =
        dateFrom && dateTo
            ? `admin-metrics-${dateFrom}-${dateTo}-${(storeIds || []).join(
                  ","
              )}`
            : null;

    return useSWR<AdminMetricsResponse>(
        key,
        () => fetchAdminMetrics({ dateFrom, dateTo, storeIds }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        }
    );
}
