// lib/hooks/analytics/useAdminStoreBreakdown.ts
import useSWR from "swr";
import { AdminStoreBreakdownResponse } from "@/lib/shared/schemas/analytics";

interface UseAdminStoreBreakdownParams {
    dateFrom: string; // YYYY-MM-DD
    dateTo: string; // YYYY-MM-DD
    storeIds?: string[];
}

const fetchAdminStoreBreakdown = async ({
    dateFrom,
    dateTo,
    storeIds,
}: UseAdminStoreBreakdownParams): Promise<AdminStoreBreakdownResponse> => {
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
        `/api/analytics/admin/store-breakdown?${params.toString()}`,
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch store breakdown: ${res.status}`;
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

export default function useAdminStoreBreakdown(
    dateFrom: string,
    dateTo: string,
    storeIds?: string[],
) {
    const key =
        dateFrom && dateTo
            ? `admin-store-breakdown-${dateFrom}-${dateTo}-${(
                  storeIds || []
              ).join(",")}`
            : null;

    return useSWR<AdminStoreBreakdownResponse>(
        key,
        () => fetchAdminStoreBreakdown({ dateFrom, dateTo, storeIds }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 5000,
        },
    );
}
