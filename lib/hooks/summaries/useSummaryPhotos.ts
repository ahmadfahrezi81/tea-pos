// lib/hooks/summaries/useSummaryPhotos.ts
import {
    SummaryPhotoResponse,
    PhotoType,
    PhotoQuantity,
} from "@/lib/schemas/daily-summary-photos";

interface UploadPhotoParams {
    file: File;
    dailySummaryId: string;
    storeId: string;
    type: PhotoType;
    expenseId?: string;
    quantity?: PhotoQuantity | null;
}

export function useSummaryPhotos() {
    // ─── Upload ────────────────────────────────────────────────────────
    const uploadPhoto = async ({
        file,
        dailySummaryId,
        storeId,
        type,
        expenseId,
        quantity,
    }: UploadPhotoParams): Promise<SummaryPhotoResponse> => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dailySummaryId", dailySummaryId);
        formData.append("storeId", storeId);
        formData.append("type", type);
        if (expenseId) formData.append("expenseId", expenseId);
        if (quantity) formData.append("quantity", JSON.stringify(quantity));

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

    // ─── Update quantity ───────────────────────────────────────────
    const updatePhotoQuantity = async (
        id: string,
        quantity: { value: number; unit: string } | null,
    ): Promise<void> => {
        const res = await fetch("/api/summaries/photo", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, quantity }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(
                errorData.error ?? "Failed to update photo quantity",
            );
        }
    };

    return {
        uploadPhoto,
        deletePhoto,
        updatePhotoQuantity,
    };
}
