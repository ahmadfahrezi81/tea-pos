// lib/hooks/analytics/useAdminTimeline.ts
import useSWR from "swr";
import { AdminTimelineResponse } from "@/lib/shared/schemas/analytics";

interface UseAdminTimelineParams {
    dateFrom: string; // YYYY-MM-DD
    dateTo: string; // YYYY-MM-DD
    storeIds?: string[];
}

const fetchAdminTimeline = async ({
    dateFrom,
    dateTo,
    storeIds,
}: UseAdminTimelineParams): Promise<AdminTimelineResponse> => {
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
        `/api/analytics/admin/timeline?${params.toString()}`,
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch admin timeline: ${res.status}`;
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

export default function useAdminTimeline(
    dateFrom: string,
    dateTo: string,
    storeIds?: string[],
) {
    const key =
        dateFrom && dateTo
            ? `admin-timeline-${dateFrom}-${dateTo}-${(storeIds || []).join(
                  ",",
              )}`
            : null;

    return useSWR<AdminTimelineResponse>(
        key,
        () => fetchAdminTimeline({ dateFrom, dateTo, storeIds }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        },
    );
}
