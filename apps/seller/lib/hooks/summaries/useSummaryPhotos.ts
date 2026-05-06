// lib/hooks/summaries/useSummaryPhotos.ts
import { summariesApi } from "@/lib/api/summaries";
import type { SummaryPhotoResponse, PhotoType, PhotoQuantity } from "@tea-pos/features/summaries/photos-schema";

interface UploadPhotoParams {
    file: File;
    dailySummaryId: string;
    storeId: string;
    type: PhotoType;
    expenseId?: string;
    quantity?: PhotoQuantity | null;
}

export function useSummaryPhotos() {
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

        const result = await summariesApi.uploadPhoto(formData);
        return result.photo;
    };

    const deletePhoto = async (id: string): Promise<void> => {
        await summariesApi.deletePhoto(id);
    };

    const updatePhotoQuantity = async (
        id: string,
        quantity: { value: number; unit: string } | null,
    ): Promise<void> => {
        await summariesApi.updatePhoto(id, quantity);
    };

    return { uploadPhoto, deletePhoto, updatePhotoQuantity };
}
