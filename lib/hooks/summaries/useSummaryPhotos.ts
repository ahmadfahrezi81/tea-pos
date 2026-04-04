// lib/hooks/summaries/useSummaryPhotos.ts
import {
    SummaryPhotoResponse,
    PhotoType,
} from "@/lib/schemas/daily-summary-photos";

interface UploadPhotoParams {
    file: File;
    dailySummaryId: string;
    storeId: string;
    type: PhotoType;
    expenseId?: string;
    notes?: string | null; // ← new
}

export function useSummaryPhotos() {
    // ─── Upload ────────────────────────────────────────────────────────
    const uploadPhoto = async ({
        file,
        dailySummaryId,
        storeId,
        type,
        expenseId,
        notes,
    }: UploadPhotoParams): Promise<SummaryPhotoResponse> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dailySummaryId", dailySummaryId);
        formData.append("storeId", storeId);
        formData.append("type", type);
        if (expenseId) formData.append("expenseId", expenseId);
        if (notes) formData.append("notes", notes); // ← new

        const res = await fetch("/api/summaries/photo", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error ?? "Failed to upload photo");
        }

        const json = await res.json();
        return json.photo as SummaryPhotoResponse;
    };

    // ─── Delete ────────────────────────────────────────────────────────
    const deletePhoto = async (id: string): Promise<void> => {
        const res = await fetch(`/api/summaries/photo?id=${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error ?? "Failed to delete photo");
        }
    };

    return {
        uploadPhoto,
        deletePhoto,
    };
}
