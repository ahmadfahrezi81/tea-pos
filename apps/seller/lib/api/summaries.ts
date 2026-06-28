import { apiFetch, buildParams } from "./client";
import type { ListDailySummariesQuery, CreateDailySummaryInput, UpdateDailySummaryInput } from "@tea-pos/features/summaries/schema";
import { DailySummaryListResponse, CreateDailySummaryResponse, UpdateDailySummaryResponse } from "@tea-pos/features/summaries/schema";
import type { ListSummaryPhotosQuery } from "@tea-pos/features/summaries/photos-schema";
import { ListSummaryPhotosResponse, UploadSummaryPhotoResponse, DeleteSummaryPhotoResponse } from "@tea-pos/features/summaries/photos-schema";

export const summariesApi = {
    list: async (params: Partial<ListDailySummariesQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return DailySummaryListResponse.parse(await apiFetch<unknown>(`/api/summaries?${sp}`));
    },
    create: async (input: CreateDailySummaryInput) => {
        return CreateDailySummaryResponse.parse(await apiFetch<unknown>("/api/summaries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
    update: async (input: UpdateDailySummaryInput) => {
        return UpdateDailySummaryResponse.parse(await apiFetch<unknown>("/api/summaries", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
        }));
    },
    getBreakdown: async (summaryId: string) => {
        return apiFetch<{ breakdown: Record<string, { quantity: number; revenue: number }> }>(
            `/api/summaries/breakdown?summaryId=${encodeURIComponent(summaryId)}`
        );
    },
    listPhotos: async (params: Partial<ListSummaryPhotosQuery>) => {
        const sp = buildParams(params as Record<string, unknown>);
        return ListSummaryPhotosResponse.parse(await apiFetch<unknown>(`/api/summaries/photo?${sp}`));
    },
    uploadPhoto: async (formData: FormData) => {
        return UploadSummaryPhotoResponse.parse(await apiFetch<unknown>("/api/summaries/photo", {
            method: "POST",
            body: formData,
        }));
    },
    updatePhoto: async (id: string, quantity: { value: number; unit: string } | null) => {
        return apiFetch<unknown>("/api/summaries/photo", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, quantity }),
        });
    },
    deletePhoto: async (id: string) => {
        return DeleteSummaryPhotoResponse.parse(await apiFetch<unknown>(
            `/api/summaries/photo?id=${encodeURIComponent(id)}`,
            { method: "DELETE" }
        ));
    },
    getPhotoCount: async (dailySummaryId: string) => {
        return apiFetch<{ count: number }>(
            `/api/summaries/photo/count?dailySummaryId=${encodeURIComponent(dailySummaryId)}`
        );
    },
    getUsers: async (summaryId: string) => {
        return apiFetch<{ users: Array<{ userId: string; userName: string | null; userAvatarUrl: string | null; totalCups: number }> }>(
            `/api/summaries/${encodeURIComponent(summaryId)}/users`
        );
    },
};
