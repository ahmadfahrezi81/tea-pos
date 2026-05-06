import { apiFetch, buildParams } from "./client";
import type { ListCustomerFeedbacksQuery, CreateCustomerFeedbackInput } from "@tea-pos/features/customer-feedbacks/schema";
import { ListCustomerFeedbacksResponse, CreateCustomerFeedbackResponse } from "@tea-pos/features/customer-feedbacks/schema";

export const feedbacksApi = {
    list: async (params: Partial<ListCustomerFeedbacksQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ListCustomerFeedbacksResponse.parse(await apiFetch<unknown>(`/api/customer-feedbacks?${sp}`));
    },
    create: async (input: CreateCustomerFeedbackInput) => {
        return CreateCustomerFeedbackResponse.parse(await apiFetch<unknown>("/api/customer-feedbacks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
};
