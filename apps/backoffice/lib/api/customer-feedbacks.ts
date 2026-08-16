import { apiFetch, buildParams } from "./client";
import type { ListCustomerFeedbacksQuery } from "@tea-pos/features/customer-feedbacks/schema";
import { ListCustomerFeedbacksResponse } from "@tea-pos/features/customer-feedbacks/schema";

export const customerFeedbacksApi = {
    list: async (params: Partial<ListCustomerFeedbacksQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ListCustomerFeedbacksResponse.parse(
            await apiFetch<unknown>(`/api/customer-feedbacks?${sp}`),
        );
    },
};
