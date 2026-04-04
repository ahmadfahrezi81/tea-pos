// // app/[tenantSlug]/mobile/analytics/daily/_components/SummaryPhotoThumbnail.tsx
// "use client";

// import { useState } from "react";
// import { X, ImageOff, Loader2 } from "lucide-react";

// interface SummaryPhotoThumbnailProps {
//     url: string;
//     alt?: string;
//     className?: string;
// }

// export function SummaryPhotoThumbnail({
//     url,
//     alt = "Summary photo",
//     className = "w-24 h-24",
// }: SummaryPhotoThumbnailProps) {
//     const [isOpen, setIsOpen] = useState(false);
//     const [isLoading, setIsLoading] = useState(true);
//     const [hasError, setHasError] = useState(false);

//     return (
//         <>
//             {/* Thumbnail */}
//             <button
//                 onClick={() => !hasError && setIsOpen(true)}
//                 className={`relative rounded-xl overflow-hidden bg-gray-100 shrink-0 active:scale-95 transition-transform ${className}`}
//             >
//                 {/* Loading state */}
//                 {isLoading && !hasError && (
//                     <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
//                         <Loader2
//                             size={20}
//                             className="text-gray-400 animate-spin"
//                         />
//                     </div>
//                 )}

//                 {/* Error state */}
//                 {hasError && (
//                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-1">
//                         <ImageOff size={20} className="text-gray-400" />
//                         <p className="text-[10px] text-gray-400">Failed</p>
//                     </div>
//                 )}

//                 {/* Image */}
//                 {!hasError && (
//                     // eslint-disable-next-line @next/next/no-img-element
//                     <img
//                         src={url}
//                         alt={alt}
//                         className={`w-full h-full object-cover transition-opacity duration-200 ${
//                             isLoading ? "opacity-0" : "opacity-100"
//                         }`}
//                         onLoad={() => setIsLoading(false)}
//                         onError={() => {
//                             setIsLoading(false);
//                             setHasError(true);
//                         }}
//                     />
//                 )}
//             </button>

//             {/* Lightbox */}
//             {isOpen && (
//                 <div
//                     className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
//                     onClick={() => setIsOpen(false)}
//                 >
//                     <button
//                         onClick={() => setIsOpen(false)}
//                         className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
//                     >
//                         <X size={22} className="text-white" />
//                     </button>

//                     {/* eslint-disable-next-line @next/next/no-img-element */}
//                     <img
//                         src={url}
//                         alt={alt}
//                         className="max-w-full max-h-full object-contain px-4"
//                         onClick={(e) => e.stopPropagation()}
//                     />
//                 </div>
//             )}
//         </>
//     );
// }

// app/[tenantSlug]/mobile/analytics/daily/_components/SummaryPhotoThumbnail.tsx
"use client";

import { useState } from "react";
import { X, ImageOff, Loader2 } from "lucide-react";

interface SummaryPhotoThumbnailProps {
    url: string;
    alt?: string;
    className?: string;
    onDelete?: () => void;
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

    return (
        <>
            {/* Wrapper — relative so delete button can be positioned */}
            <div className={`relative ${className}`}>
                {/* Thumbnail button */}
                <button
                    onClick={() => !hasError && setIsOpen(true)}
                    className="w-full h-full rounded-xl overflow-hidden bg-gray-100 shrink-0 active:scale-95 transition-transform"
                >
                    {/* Loading state */}
                    {isLoading && !hasError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <Loader2
                                size={20}
                                className="text-gray-400 animate-spin"
                            />
                        </div>
                    )}

                    {/* Error state */}
                    {hasError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-1">
                            <ImageOff size={20} className="text-gray-400" />
                            <p className="text-[10px] text-gray-400">Failed</p>
                        </div>
                    )}

                    {/* Image */}
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

                {/* Delete button — only shown if onDelete is provided */}
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="absolute top-1 right-1 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <X size={22} className="text-white" />
                    </button>
                )}
            </div>

            {/* Lightbox */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <X size={22} className="text-white" />
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
