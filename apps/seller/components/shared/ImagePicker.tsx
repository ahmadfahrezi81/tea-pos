"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { compressPhoto } from "@/lib/compressPhoto";

interface ImagePickerProps {
    previewUrl: string | null;
    onCapture: (file: File, previewUrl: string) => void;
    onRemove: () => void;
    onError?: (message: string) => void;
    onCompressingChange?: (isCompressing: boolean) => void;
    label?: string;
    emptyHeight?: string;
}

export function ImagePicker({
    previewUrl,
    onCapture,
    onRemove,
    onError,
    onCompressingChange,
    label = "Add photo (optional)",
    emptyHeight = "h-20",
}: ImagePickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isCompressing, setIsCompressing] = useState(false);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCompressing(true);
        onCompressingChange?.(true);
        try {
            const compressed = await compressPhoto(file);
            onCapture(compressed, URL.createObjectURL(compressed));
        } catch {
            onError?.("Failed to process photo. Please try again.");
        } finally {
            setIsCompressing(false);
            onCompressingChange?.(false);
            e.target.value = "";
        }
    };

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleChange}
            />
            {previewUrl ? (
                <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                    <button
                        onClick={onRemove}
                        className="absolute top-2 right-2 bg-black/50 text-white text-sm px-2 py-1 rounded-md"
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isCompressing}
                    className={`w-full ${emptyHeight} border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 text-base active:bg-gray-50 disabled:opacity-60`}
                >
                    {isCompressing ? (
                        <Loader2 size={20} className="animate-spin" />
                    ) : (
                        <>
                            <Camera size={20} />
                            <span>{label}</span>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
