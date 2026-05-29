import { apiFetch, buildParams } from "./client";
import type { CreateReimbursementInput, ListReimbursementsQuery } from "@tea-pos/features/reimbursements/schema";
import { ReimbursementListResponse, ReimbursementResponse } from "@tea-pos/features/reimbursements/schema";

export const reimbursementsApi = {
    list: async (params?: Partial<ListReimbursementsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return ReimbursementListResponse.parse(await apiFetch<unknown>(`/api/reimbursements?${sp}`));
    },

    create: async (input: CreateReimbursementInput) => {
        return ReimbursementResponse.parse(
            await apiFetch<unknown>("/api/reimbursements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
