// app/[tenantSlug]/mobile/analytics/daily/_components/SinglePhotoStep.tsx
"use client";

import { useRef, useState } from "react";
import { X, ImagePlus, Loader2, CircleMinus, CheckCircle2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
import { PhotoType } from "@/lib/schemas/daily-summary-photos";
import { SlottedPhoto, SavedSlottedPhoto } from "./PhotoStep";

const COMPRESSION_OPTIONS = {
    maxSizeMB: 0.4,
    maxWidthOrHeight: 1080,
    useWebWorker: true,
    fileType: "image/webp" as const,
    initialQuality: 0.6,
};

interface SinglePhotoStepProps {
    label: string;
    placeholder: string;
    type: PhotoType;
    photo?: SlottedPhoto;
    savedPhoto?: SavedSlottedPhoto;
    onPhotoChange: (photo: SlottedPhoto | null) => void;
    onSavedPhotoDelete?: () => Promise<void>; // ← was () => void
    onNotesChange: (notes: string) => void;
}
export function SinglePhotoStep({
    label,
    placeholder,
    type,
    photo,
    savedPhoto,
    onPhotoChange,
    onSavedPhotoDelete,
    onNotesChange,
}: SinglePhotoStepProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const currentNotes = photo?.notes ?? savedPhoto?.notes ?? "";
    const hasPhoto = !!photo || !!savedPhoto;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsCompressing(true);
        try {
            const compressed = await imageCompression(
                file,
                COMPRESSION_OPTIONS,
            );
            const preview = URL.createObjectURL(compressed);
            if (photo) URL.revokeObjectURL(photo.preview);
            onPhotoChange({
                type,
                file: compressed,
                preview,
                notes: photo?.notes ?? "",
            });
        } catch (err) {
            console.error("Compression failed — using original:", err);
            const preview = URL.createObjectURL(file);
            if (photo) URL.revokeObjectURL(photo.preview);
            onPhotoChange({ type, file, preview, notes: photo?.notes ?? "" });
        } finally {
            setIsCompressing(false);
            e.target.value = "";
        }
    };

    const handleRemove = () => {
        if (photo) URL.revokeObjectURL(photo.preview);
        onPhotoChange(null);
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
                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide px-1">
                        Quantity
                    </p>
                    <textarea
                        value={currentNotes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        placeholder={placeholder}
                        maxLength={500}
                        rows={3}
                        className="w-full p-3 text-sm text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
                    />
                </div>

                {/* Photo area — large */}
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
                                />
                            </div>
                        ) : photo ? (
                            <div className="relative w-full h-full">
                                <SummaryPhotoThumbnail
                                    url={photo.preview}
                                    alt={label}
                                    className="w-full h-full"
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
