import useSWR from "swr";
import { ListCustomerFeedbacksResponse } from "@/lib/shared/schemas/customer-feedbacks";

interface UseCustomerFeedbacksParams {
    tenantId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

const fetchCustomerFeedbacks = async (
    params: UseCustomerFeedbacksParams,
): Promise<ListCustomerFeedbacksResponse> => {
    const searchParams = new URLSearchParams();

    if (params.tenantId) searchParams.append("tenantId", params.tenantId);
    if (params.userId) searchParams.append("userId", params.userId);
    if (params.limit !== undefined)
        searchParams.append("limit", String(params.limit));
    if (params.offset !== undefined)
        searchParams.append("offset", String(params.offset));

    const res = await fetch(
        `/api/customer-feedbacks?${searchParams.toString()}`,
    );

    if (!res.ok) {
        let errMsg = `Failed to fetch customer feedbacks: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }

    const json = await res.json();
    const parsed = ListCustomerFeedbacksResponse.safeParse(json);

    if (!parsed.success) {
        console.error(
            "Invalid customer feedbacks response:",
            parsed.error.format(),
        );
        return { feedbacks: [], total: 0 };
    }

    return parsed.data;
};

export default function useCustomerFeedbacks(
    params: UseCustomerFeedbacksParams = {},
) {
    const { tenantId, userId, limit = 20, offset = 0 } = params;

    const key = `customer-feedbacks-${tenantId ?? "all"}-${userId ?? "all"}-${limit}-${offset}`;

    return useSWR<ListCustomerFeedbacksResponse>(
        key,
        () => fetchCustomerFeedbacks({ tenantId, userId, limit, offset }),
        {
            revalidateOnFocus: true,
            dedupingInterval: 10_000,
        },
    );
}
