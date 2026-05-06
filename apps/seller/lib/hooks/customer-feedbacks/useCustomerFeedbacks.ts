import useSWR from "swr";
import { feedbacksApi } from "@/lib/api/customer-feedbacks";
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

    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => feedbacksApi.list({ tenantId, userId, limit, offset }),
        { revalidateOnFocus: true, dedupingInterval: 10_000 },
    );
}
