"use client";

import { useState } from "react";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { PhotoType } from "@tea-pos/features/summaries/photos-schema";
import {
    SlottedPhoto,
    SavedSlottedPhoto,
} from "@tea-pos/features/summaries/photos-schema";

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
}: SinglePhotoStepProps) {
    const quantityConfig = QUANTITY_CONFIG[type] ?? null;
    const initialQuantity = quantity?.value ?? 0;
    const [localQuantityValue, setLocalQuantityValue] = useState<string>(
        initialQuantity === 0 ? "" : String(initialQuantity),
    );

    const handleQuantityBlur = () => {
        if (!quantityConfig) return;
        const val = parseFloat(localQuantityValue);
        onQuantityChange(
            isNaN(val) || val < 0
                ? null
                : { value: val, unit: quantityConfig.unit },
        );
    };

    const handleQuantityKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
    ) => {
        if (e.key === "Enter") e.currentTarget.blur();
    };

    return (
        <div className="flex flex-col gap-3 pt-0">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                    Take a photo and input the amount if needed.
                </p>
            </div>

            <div className="p-3 bg-white flex flex-col gap-4 rounded-2xl border border-gray-50">
                {quantityConfig && (
                    <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                            Quantity <span className="text-red-500">*</span>
                        </p>
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                            <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                value={localQuantityValue}
                                onChange={(e) =>
                                    setLocalQuantityValue(e.target.value)
                                }
                                onBlur={handleQuantityBlur}
                                onKeyDown={handleQuantityKeyDown}
                                placeholder={quantityConfig.placeholder}
                                className="flex-1 p-3 text-base text-gray-800 placeholder-gray-400 border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="px-4 py-3 bg-white border-l border-gray-200 text-sm font-semibold text-gray-500">
                                {quantityConfig.unit}
                            </div>
                        </div>
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
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
