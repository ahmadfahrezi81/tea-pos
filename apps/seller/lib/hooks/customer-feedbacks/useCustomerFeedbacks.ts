import useSWR from "swr";
import { customerFeedbacksApi } from "@/lib/api/customer-feedbacks";
import type { ListCustomerFeedbacksResponse } from "@tea-pos/features/customer-feedbacks/schema";
import { SWR } from "@tea-pos/utils/swr";

interface UseCustomerFeedbacksParams {
    tenantId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

export default function useCustomerFeedbacks(params: UseCustomerFeedbacksParams = {}) {
    const { tenantId, userId, limit = 20, offset = 0 } = params;
    const key = `customer-feedbacks-${tenantId ?? "all"}-${userId ?? "all"}-${limit}-${offset}`;

    /*
     * `COOL` rather than the 30s floor. This is a history list on `more/map`;
     * nothing about it is time-critical, and refetching it every time a phone
     * wakes was the same mistake as `useWeather` — focus revalidation is off
     * app-wide in the root now. See task 063 — a small win, taken because it is one line.
     */
    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => customerFeedbacksApi.list({ tenantId, userId, limit, offset }),
        { dedupingInterval: SWR.COOL },
    );
}
