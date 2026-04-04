"use client";

import { useState } from "react";
import {
    X,
    ImageOff,
    Loader2,
    CircleMinus,
    Check,
    CloudCheck,
} from "lucide-react";

interface SummaryPhotoThumbnailProps {
    url: string;
    alt?: string;
    className?: string;
    onDelete?: () => Promise<void>;
}

export function SummaryPhotoThumbnail({
    url,
    alt = "Summary photo",
    className = "w-24 h-24",
    onDelete,
}: SummaryPhotoThumbnailProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            await onDelete();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className={`relative ${className}`}>
                <button
                    onClick={() => !hasError && setIsOpen(true)}
                    className="w-full h-full rounded-lg overflow-hidden bg-gray-100 shrink-0"
                >
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <Loader2
                                size={20}
                                className="text-gray-400 animate-spin"
                            />
                        </div>
                    )}
                    {hasError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-1">
                            <ImageOff size={20} className="text-gray-400" />
                            <p className="text-[10px] text-gray-400">Failed</p>
                        </div>
                    )}
                    {!hasError && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={url}
                            alt={alt}
                            className={`w-full h-full object-cover transition-opacity duration-200 ${
                                isLoading ? "opacity-0" : "opacity-100"
                            }`}
                            onLoad={() => setIsLoading(false)}
                            onError={() => {
                                setIsLoading(false);
                                setHasError(true);
                            }}
                        />
                    )}
                </button>

                {/* Uploaded checkmark — top left */}
                {!isLoading && !hasError && (
                    <div className="absolute bottom-1 left-1 bg-green-500/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <CloudCheck size={16} className="text-white" />
                        <p className="text-white text-xs font-semibold">
                            Saved
                        </p>
                    </div>
                )}
                {onDelete && (
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="absolute top-2 right-2 w-9 h-9 bg-black rounded-lg flex items-center justify-center disabled:opacity-60"
                    >
                        {isDeleting ? (
                            <Loader2
                                size={18}
                                className="text-white animate-spin"
                            />
                        ) : (
                            <CircleMinus size={24} className="text-white" />
                        )}
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-black flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={30} className="text-white" />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={url}
                        alt={alt}
                        className="max-w-full max-h-full object-contain px-4"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
