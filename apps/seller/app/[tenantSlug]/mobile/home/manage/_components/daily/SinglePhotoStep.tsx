"use client";

import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { PhotoPicker } from "../shared/PhotoPicker";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { PhotoType } from "@tea-pos/features/summaries/photos-schema";
import {
    SlottedPhoto,
    SavedSlottedPhoto,
} from "@tea-pos/features/summaries/photos-schema";
import { useT } from "@/lib/hooks/useT";

const QUANTITY_CONFIG: Partial<
    Record<PhotoType, { unit: string; placeholder: string }>
> = {
    "closing:cups": { unit: "pcs", placeholder: "0" },
    "closing:tea": { unit: "L", placeholder: "0" },
};

interface SinglePhotoStepProps {
    label: string;
    type: PhotoType;
    photo?: SlottedPhoto;
    savedPhoto?: SavedSlottedPhoto;
    quantity?: { value: number; unit: string } | null;
    onPhotoChange: (photo: SlottedPhoto | null) => void;
    onSavedPhotoDelete?: () => Promise<void>;
    onQuantityChange: (
        quantity: { value: number; unit: string } | null,
    ) => void;
    onError?: (message: string) => void;
}

export function SinglePhotoStep({
    label,
    type,
    photo,
    savedPhoto,
    quantity,
    onPhotoChange,
    onSavedPhotoDelete,
    onQuantityChange,
    onError,
}: SinglePhotoStepProps) {
    const t = useT();
    const quantityConfig = QUANTITY_CONFIG[type] ?? null;

    const getDescription = (): string => {
        if (type === "closing:ice") return t("manage.photoDescriptions.ice");
        if (type === "closing:syrup") return t("manage.photoDescriptions.syrup");
        if (type === "closing:bags") return t("manage.photoDescriptions.bags");
        if (type === "closing:cups") return t("manage.photoDescriptions.cups");
        if (type === "closing:tea") return t("manage.photoDescriptions.tea");
        if (type === "opening") return t("manage.photoDescriptions.opening");
        return "Take a photo and input the amount if needed.";
    };

    return (
        <div className="flex flex-col gap-3 pt-0">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                    {getDescription()}
                </p>
            </div>

            <div className="p-3 bg-white flex flex-col gap-4 rounded-2xl border border-gray-50">
                {quantityConfig && (
                    <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                            Quantity <span className="text-red-500">*</span>
                        </p>
                        <NumberInput
                            value={quantity?.value ?? 0}
                            unit={quantityConfig.unit}
                            placeholder={quantityConfig.placeholder}
                            onChange={(val) =>
                                onQuantityChange(
                                    val === 0 ? null : { value: val, unit: quantityConfig.unit },
                                )
                            }
                        />
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                        Attachment{" "}
                        <span className="text-red-500 text-base">*</span>
                    </p>
                    {savedPhoto ? (
                        <div className="w-full h-52 rounded-xl overflow-hidden">
                            <SummaryPhotoThumbnail
                                url={savedPhoto.url}
                                alt={label}
                                className="w-full h-full"
                                onDelete={onSavedPhotoDelete}
                                compact={false}
                            />
                        </div>
                    ) : (
                        <PhotoPicker
                            previewUrl={photo?.preview ?? null}
                            onCapture={(file, url) => {
                                if (photo) URL.revokeObjectURL(photo.preview);
                                onPhotoChange({ type, file, preview: url, quantity: photo?.quantity ?? null });
                            }}
                            onRemove={() => {
                                if (photo) URL.revokeObjectURL(photo.preview);
                                onPhotoChange(null);
                            }}
                            onError={onError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
