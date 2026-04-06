"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, CircleMinus } from "lucide-react";
import imageCompression from "browser-image-compression";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { PhotoType } from "@/lib/schemas/daily-summary-photos";
import {
    SlottedPhoto,
    SavedSlottedPhoto,
} from "@/lib/schemas/daily-summary-photos";

// Slots that have a quantity input and their fixed unit
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
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const quantityConfig = QUANTITY_CONFIG[type] ?? null;
    const initialQuantity = quantity?.value ?? 0;
    const [localQuantityValue, setLocalQuantityValue] = useState<string>(
        initialQuantity === 0 ? "" : String(initialQuantity),
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            // ─── Detect WebP encoding support ──────────────────────────────
            const supportsWebP = await new Promise<boolean>((resolve) => {
                const canvas = document.createElement("canvas");
                canvas.width = 1;
                canvas.height = 1;
                resolve(
                    canvas
                        .toDataURL("image/webp")
                        .startsWith("data:image/webp"),
                );
            });

            // ─── Attempt primary compression ───────────────────────────────
            const primaryOptions = {
                maxSizeMB: 0.4,
                maxWidthOrHeight: 1080,
                useWebWorker: true,
                fileType: supportsWebP
                    ? ("image/webp" as const)
                    : ("image/jpeg" as const),
                initialQuality: supportsWebP ? 0.6 : 0.7,
            };

            let compressed = await imageCompression(file, primaryOptions);

            // ─── Safety net: if output is PNG (iOS silent fallback), re-compress as JPEG
            if (
                compressed.type === "image/png" ||
                compressed.type === "image/heic" ||
                compressed.type === "image/heif"
            ) {
                compressed = await imageCompression(file, {
                    maxSizeMB: 0.4,
                    maxWidthOrHeight: 1080,
                    useWebWorker: true,
                    fileType: "image/jpeg" as const,
                    initialQuality: 0.7,
                });
            }

            // ─── Final safety net: if still not jpeg or webp, reject ───────
            if (
                !["image/webp", "image/jpeg", "image/jpg"].includes(
                    compressed.type,
                )
            ) {
                throw new Error(
                    `Unsupported output format: ${compressed.type}`,
                );
            }

            const preview = URL.createObjectURL(compressed);
            if (photo) URL.revokeObjectURL(photo.preview);
            onPhotoChange({
                type,
                file: compressed,
                preview,
                quantity: photo?.quantity ?? null,
            });
        } catch (err) {
            console.error("Compression failed:", err);
            // ─── Last resort: try raw file as JPEG if it's a supported type
            if (["image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
                const preview = URL.createObjectURL(file);
                if (photo) URL.revokeObjectURL(photo.preview);
                onPhotoChange({
                    type,
                    file,
                    preview,
                    quantity: photo?.quantity ?? null,
                });
            } else {
                // Can't safely upload this file type — surface error to user
                // You can wire this to a toast or error state if you want
                console.error("Cannot upload file of type:", file.type);
            }
        } finally {
            setIsCompressing(false);
            e.target.value = "";
        }
    };
    const handleRemove = () => {
        if (photo) URL.revokeObjectURL(photo.preview);
        onPhotoChange(null);
    };

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
            {/* Title */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900">{label}</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                    Take a photo and input the amount if needed.
                </p>
            </div>

            <div className="p-3 bg-white flex flex-col gap-4 rounded-2xl border border-gray-50">
                {/* Quantity — only for cups and tea waste */}
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

                {/* Photo area */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                        Attachment{" "}
                        <span className="text-red-500 text-base">*</span>
                    </p>
                    <div
                        className={`w-52 aspect-square rounded-lg overflow-hidden bg-gray-50 relative ${
                            !photo && !savedPhoto
                                ? "border-2 border-dashed border-gray-400"
                                : ""
                        }`}
                    >
                        {isCompressing ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                                <Loader2
                                    size={28}
                                    className="text-brand animate-spin"
                                />
                                <p className="text-sm text-gray-400">
                                    Compressing...
                                </p>
                            </div>
                        ) : savedPhoto ? (
                            <div className="relative w-full h-full">
                                <SummaryPhotoThumbnail
                                    url={savedPhoto.url}
                                    alt={label}
                                    className="w-full h-full"
                                    onDelete={onSavedPhotoDelete}
                                    compact={false}
                                />
                            </div>
                        ) : photo ? (
                            <div className="relative w-full h-full">
                                <SummaryPhotoThumbnail
                                    url={photo.preview}
                                    alt={label}
                                    className="w-full h-full"
                                    isSaved={false}
                                />
                                <button
                                    onClick={handleRemove}
                                    className="absolute top-2 right-2 w-9 h-9 bg-black rounded-lg flex items-center justify-center"
                                >
                                    <CircleMinus
                                        size={24}
                                        className="text-white"
                                    />
                                </button>
                                <button
                                    onClick={() => inputRef.current?.click()}
                                    className="absolute bottom-2 right-2 bg-black rounded-lg px-3 py-1.5"
                                >
                                    <p className="text-white text-sm font-semibold">
                                        Retake
                                    </p>
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => inputRef.current?.click()}
                                className="w-full h-full flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
                            >
                                <ImagePlus
                                    size={40}
                                    className="text-gray-500"
                                />
                            </button>
                        )}
                    </div>
                </div>

                {/* Hidden input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
}
