import useSWR from "swr";
import { customerFeedbacksApi } from "@/lib/api/customer-feedbacks";
import type { ListCustomerFeedbacksResponse } from "@tea-pos/features/customer-feedbacks/schema";

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
     * No `revalidateOnFocus`, and a 60s dedupe rather than 10s. This is a
     * history list on `more/map`; nothing about it is time-critical, and
     * refetching it every time a phone wakes was the same mistake as
     * `useWeather`. See task 063 — a small win, taken because it is one line.
     */
    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => customerFeedbacksApi.list({ tenantId, userId, limit, offset }),
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );
}
