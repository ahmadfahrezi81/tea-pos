import useSWR from "swr";
import { customerFeedbacksApi } from "@/lib/api/customer-feedbacks";
import type { ListCustomerFeedbacksResponse } from "@tea-pos/features/customer-feedbacks/schema";

interface UseCustomerFeedbacksParams {
    userId?: string;
    limit?: number;
    offset?: number;
}

/** The tenant is resolved server-side from the cookie, so it is not a param here. */
export default function useCustomerFeedbacks(params: UseCustomerFeedbacksParams = {}) {
    const { userId, limit = 20, offset = 0 } = params;
    const key = `customer-feedbacks-${userId ?? "all"}-${limit}-${offset}`;

    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => customerFeedbacksApi.list({ userId, limit, offset }),
        { revalidateOnFocus: true, dedupingInterval: 10_000 },
    );
}
