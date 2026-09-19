import useSWR from "swr";
import { customerFeedbacksApi } from "@/lib/api/customer-feedbacks";
import type { ListCustomerFeedbacksResponse } from "@tea-pos/features/customer-feedbacks/schema";
import { SWR } from "@tea-pos/utils/swr";

interface UseCustomerFeedbacksParams {
    userId?: string;
    limit?: number;
    offset?: number;
}

/** The tenant is resolved server-side from the cookie, so it is not a param here. */
export default function useCustomerFeedbacks(params: UseCustomerFeedbacksParams = {}) {
    const { userId, limit = 20, offset = 0 } = params;
    const key = `customer-feedbacks-${userId ?? "all"}-${limit}-${offset}`;

    /*
     * `COOL` rather than the 30s floor. This is a history list on `more/map`;
     * nothing about it is time-critical, and refetching it every time a phone
     * wakes was the same mistake as `useWeather` — focus revalidation is off
     * app-wide in the root now. See task 063; seller's copy carries the same change.
     */
    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => customerFeedbacksApi.list({ userId, limit, offset }),
        { dedupingInterval: SWR.COOL },
    );
}
