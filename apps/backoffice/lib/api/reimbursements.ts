import { apiFetch, buildParams } from "./client";
import type { ListAllReimbursementsQuery, UpdateReimbursementStatusInput } from "@tea-pos/features/reimbursements/schema";
import { ReimbursementListResponse, ReimbursementResponse } from "@tea-pos/features/reimbursements/schema";

export const reimbursementsApi = {
    listAll: async (params?: Partial<ListAllReimbursementsQuery>) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return ReimbursementListResponse.parse(await apiFetch<unknown>(`/api/reimbursements?${sp}`));
    },

    updateStatus: async (id: string, input: UpdateReimbursementStatusInput) => {
        return ReimbursementResponse.parse(
            await apiFetch<unknown>(`/api/reimbursements/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input),
            }),
        );
    },
};
