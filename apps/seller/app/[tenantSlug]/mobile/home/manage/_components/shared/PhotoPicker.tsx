"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, CircleMinus } from "lucide-react";
import { compressPhoto } from "@/lib/compressPhoto";

interface PhotoPickerProps {
    previewUrl: string | null;
    onCapture: (file: File, previewUrl: string) => void;
    onRemove: () => void;
    onError?: (message: string) => void;
    allowGallery?: boolean;
}

export function PhotoPicker({ previewUrl, onCapture, onRemove, onError, allowGallery = false }: PhotoPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCompressing(true);
        try {
            const compressed = await compressPhoto(file);
            onCapture(compressed, URL.createObjectURL(compressed));
        } catch (err) {
            console.error("Compression failed:", err);
            if (["image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
                onCapture(file, URL.createObjectURL(file));
            } else {
                onError?.("Failed to process photo. Please try again.");
            }
        } finally {
            setIsCompressing(false);
            e.target.value = "";
        }
    };

    return (
        <div
            className={`w-full h-52 rounded-xl overflow-hidden relative transition-transform active:scale-[0.97] ${
                previewUrl && !isCompressing
                    ? "bg-black"
                    : "border-3 border-dashed border-brand"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                {...(!allowGallery && { capture: "environment" })}
                className="hidden"
                onChange={handleFileChange}
            />

            {isCompressing ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 size={28} className="text-brand animate-spin" />
                    <p className="text-sm text-gray-400">Compressing...</p>
                </div>
            ) : previewUrl ? (
                <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    <button
                        onClick={onRemove}
                        className="absolute top-2 right-2 w-9 h-9 bg-black/70 rounded-lg flex items-center justify-center"
                    >
                        <CircleMinus size={24} className="text-white" />
                    </button>
                    <button
                        onClick={() => inputRef.current?.click()}
                        className="absolute bottom-2 right-2 bg-black/70 rounded-lg px-3 py-1.5"
                    >
                        <span className="text-white text-sm font-semibold">Retake</span>
                    </button>
                </>
            ) : (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5"
                >
                    {allowGallery ? (
                        <ImagePlus size={40} strokeWidth={2} className="text-brand" />
                    ) : (
                        <Camera size={40} strokeWidth={2} className="text-brand" />
                    )}
                    <span className="text-sm font-medium text-gray-900">Tap to add photo</span>
                </button>
            )}
        </div>
    );
}
