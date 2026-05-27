"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CircleMinus } from "lucide-react";
import { compressPhoto } from "@/lib/compressPhoto";

interface PhotoPickerProps {
    previewUrl: string | null;
    onCapture: (file: File, previewUrl: string) => void;
    onRemove: () => void;
    onError?: (message: string) => void;
}

export function PhotoPicker({ previewUrl, onCapture, onRemove, onError }: PhotoPickerProps) {
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
            className={`w-full h-52 rounded-xl overflow-hidden relative ${
                previewUrl && !isCompressing
                    ? "bg-black"
                    : "bg-gray-50 border-2 border-dashed border-gray-300"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
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
                    className="w-full h-full flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <Camera size={40} className="text-gray-400" />
                </button>
            )}
        </div>
    );
}
