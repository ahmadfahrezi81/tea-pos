// // app/[tenantSlug]/mobile/analytics/daily/_components/PhotoStep.tsx
// "use client";

// import { useRef, useState } from "react";
// import {
//     X,
//     ImagePlus,
//     Loader2,
//     ChevronDown,
//     ChevronUp,
//     CheckCircle2,
//     Circle,
// } from "lucide-react";
// import imageCompression from "browser-image-compression";
// import { SummaryPhotoThumbnail } from "./SummaryPhotoThumbnail";
// import { PhotoType } from "@/lib/schemas/daily-summary-photos";

// const COMPRESSION_OPTIONS = {
//     maxSizeMB: 0.4,
//     maxWidthOrHeight: 1080,
//     useWebWorker: true,
//     fileType: "image/webp" as const,
//     initialQuality: 0.6,
// };

// // ============================================================================
// // SLOT CONFIG
// // ============================================================================

// export const PHOTO_SLOTS: {
//     type: PhotoType;
//     label: string;
//     placeholder: string;
// }[] = [
//     {
//         type: "closing:ice",
//         label: "Ice Bin",
//         placeholder: "e.g. 2 bags remaining",
//     },
//     {
//         type: "closing:syrup",
//         label: "Syrup",
//         placeholder: "e.g. 3 bottles left",
//     },
//     {
//         type: "closing:bags",
//         label: "Bags",
//         placeholder: "e.g. 1 pack remaining",
//     },
//     { type: "closing:cups", label: "Cups", placeholder: "e.g. ~50 cups left" },
//     {
//         type: "closing:tea",
//         label: "Tea Waste",
//         placeholder: "e.g. half a pack",
//     },
// ];

// // ============================================================================
// // TYPES
// // ============================================================================

// export interface SlottedPhoto {
//     type: PhotoType;
//     file: File;
//     preview: string;
//     quantity?: { value: number; unit: string } | null;
// }

// export interface SavedSlottedPhoto {
//     id: string;
//     type: PhotoType;
//     url: string;
//     quantity?: { value: number; unit: string } | null;
// }

// interface PhotoStepProps {
//     photos: SlottedPhoto[];
//     onPhotosChange: (photos: SlottedPhoto[]) => void;
//     savedPhotos?: SavedSlottedPhoto[];
//     onSavedPhotoDelete?: (id: string) => void;
// }

// // ============================================================================
// // COMPONENT
// // ============================================================================

// export function PhotoStep({
//     photos,
//     onPhotosChange,
//     savedPhotos = [],
//     onSavedPhotoDelete,
// }: PhotoStepProps) {
//     const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
//     const [compressingSlot, setCompressingSlot] = useState<PhotoType | null>(
//         null,
//     );
//     const [openSlots, setOpenSlots] = useState<Record<string, boolean>>({});
//     const [savedNoteOverrides, setSavedNoteOverrides] = useState<
//         Record<string, string>
//     >({});

//     const getSlotPhoto = (type: PhotoType): SlottedPhoto | undefined =>
//         photos.find((p) => p.type === type);

//     const getSavedSlotPhoto = (
//         type: PhotoType,
//     ): SavedSlottedPhoto | undefined =>
//         savedPhotos.find((p) => p.type === type);

//     const toggleSlot = (type: PhotoType) => {
//         setOpenSlots((prev) => ({ ...prev, [type]: !prev[type] }));
//     };

//     const handleFileChange = async (
//         e: React.ChangeEvent<HTMLInputElement>,
//         type: PhotoType,
//     ) => {
//         const file = e.target.files?.[0];
//         if (!file) return;

//         setCompressingSlot(type);
//         try {
//             // First attempt — compress + convert to WebP
//             const compressed = await imageCompression(
//                 file,
//                 COMPRESSION_OPTIONS,
//             );
//             const preview = URL.createObjectURL(compressed);
//             const existing = getSlotPhoto(type);
//             if (existing) URL.revokeObjectURL(existing.preview);
//             const updated = photos.filter((p) => p.type !== type);
//             onPhotosChange([
//                 ...updated,
//                 {
//                     type,
//                     file: compressed,
//                     preview,
//                     notes: existing?.notes ?? "",
//                 },
//             ]);
//         } catch (err) {
//             console.error(
//                 "WebP compression failed — trying without WebP:",
//                 err,
//             );
//             try {
//                 // Second attempt — compress without forcing WebP (iOS fallback)
//                 const fallback = await imageCompression(file, {
//                     maxSizeMB: 0.8,
//                     maxWidthOrHeight: 1920,
//                     useWebWorker: true,
//                 });
//                 const preview = URL.createObjectURL(fallback);
//                 const existing = getSlotPhoto(type);
//                 if (existing) URL.revokeObjectURL(existing.preview);
//                 const updated = photos.filter((p) => p.type !== type);
//                 onPhotosChange([
//                     ...updated,
//                     {
//                         type,
//                         file: fallback,
//                         preview,
//                         notes: existing?.notes ?? "",
//                     },
//                 ]);
//             } catch {
//                 // Last resort — use original file as-is
//                 console.error("All compression failed — using original");
//                 const preview = URL.createObjectURL(file);
//                 const existing = getSlotPhoto(type);
//                 if (existing) URL.revokeObjectURL(existing.preview);
//                 const updated = photos.filter((p) => p.type !== type);
//                 onPhotosChange([
//                     ...updated,
//                     { type, file, preview, notes: existing?.notes ?? "" },
//                 ]);
//             }
//         } finally {
//             setCompressingSlot(null);
//             e.target.value = "";
//         }
//     };

//     const handleRemoveLocal = (type: PhotoType) => {
//         const existing = getSlotPhoto(type);
//         if (existing) URL.revokeObjectURL(existing.preview);
//         onPhotosChange(photos.filter((p) => p.type !== type));
//     };

//     const handleNotesChange = (type: PhotoType, notes: string) => {
//         const updated = photos.map((p) =>
//             p.type === type ? { ...p, notes } : p,
//         );
//         onPhotosChange(updated);
//     };

//     return (
//         <div className="flex flex-col gap-3">
//             {PHOTO_SLOTS.map((slot) => {
//                 const localPhoto = getSlotPhoto(slot.type);
//                 const savedPhoto = getSavedSlotPhoto(slot.type);
//                 const hasPhoto = !!localPhoto || !!savedPhoto;
//                 const isCompressing = compressingSlot === slot.type;
//                 const isOpen = !!openSlots[slot.type];
//                 const currentNotes =
//                     localPhoto?.notes ??
//                     savedNoteOverrides[slot.type] ??
//                     savedPhoto?.notes ??
//                     "";

//                 return (
//                     <div
//                         key={slot.type}
//                         className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
//                     >
//                         {/* Accordion header */}
//                         <button
//                             onClick={() => toggleSlot(slot.type)}
//                             className="w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50 transition-colors"
//                         >
//                             <div className="flex items-center gap-2.5">
//                                 {hasPhoto ? (
//                                     <CheckCircle2
//                                         size={20}
//                                         className="text-green-500 shrink-0"
//                                     />
//                                 ) : (
//                                     <Circle
//                                         size={20}
//                                         className="text-gray-300 shrink-0"
//                                     />
//                                 )}
//                                 <p className="text-md font-semibold text-gray-800">
//                                     {slot.label}
//                                 </p>
//                                 {!isOpen && currentNotes && (
//                                     <p className="text-xs text-gray-400 truncate max-w-[120px]">
//                                         {currentNotes}
//                                     </p>
//                                 )}
//                             </div>
//                             {isOpen ? (
//                                 <ChevronUp
//                                     size={18}
//                                     className="text-gray-500 shrink-0"
//                                 />
//                             ) : (
//                                 <ChevronDown
//                                     size={18}
//                                     className="text-gray-500 shrink-0"
//                                 />
//                             )}
//                         </button>

//                         {/* Accordion body */}
//                         {isOpen && (
//                             <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
//                                 {/* Square photo */}
//                                 <div className="aspect-square w-42 relative rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 mt-3">
//                                     {isCompressing ? (
//                                         <div className="w-full h-full flex items-center justify-center gap-2">
//                                             <Loader2
//                                                 size={20}
//                                                 className="text-brand animate-spin"
//                                             />
//                                             <p className="text-sm text-gray-400">
//                                                 Compressing...
//                                             </p>
//                                         </div>
//                                     ) : savedPhoto ? (
//                                         <div className="relative w-full h-full overflow-hidden">
//                                             <SummaryPhotoThumbnail
//                                                 url={savedPhoto.url}
//                                                 alt={slot.label}
//                                                 className="w-full h-full"
//                                                 onDelete={async () => {
//                                                     await onSavedPhotoDelete?.(
//                                                         savedPhoto.id,
//                                                     );
//                                                 }}
//                                             />
//                                             <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-green-400 shadow-sm" />
//                                         </div>
//                                     ) : localPhoto ? (
//                                         <div className="relative w-full h-full overflow-hidden">
//                                             <SummaryPhotoThumbnail
//                                                 url={localPhoto.preview}
//                                                 alt={slot.label}
//                                                 className="w-full h-full"
//                                             />
//                                             <button
//                                                 onClick={(e) => {
//                                                     e.stopPropagation();
//                                                     handleRemoveLocal(
//                                                         slot.type,
//                                                     );
//                                                 }}
//                                                 className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
//                                             >
//                                                 <X
//                                                     size={14}
//                                                     className="text-white"
//                                                 />
//                                             </button>
//                                             <button
//                                                 onClick={(e) => {
//                                                     e.stopPropagation();
//                                                     inputRefs.current[
//                                                         slot.type
//                                                     ]?.click();
//                                                 }}
//                                                 className="absolute bottom-2 right-2 bg-black/60 rounded-full px-2 py-1"
//                                             >
//                                                 <p className="text-white text-sm font-semibold">
//                                                     Retake
//                                                 </p>
//                                             </button>
//                                         </div>
//                                     ) : (
//                                         <button
//                                             onClick={() =>
//                                                 inputRefs.current[
//                                                     slot.type
//                                                 ]?.click()
//                                             }
//                                             className="w-full h-full flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
//                                         >
//                                             <ImagePlus
//                                                 size={28}
//                                                 className="text-gray-300"
//                                             />
//                                             <p className="text-sm text-gray-400">
//                                                 Tap to add photo
//                                             </p>
//                                         </button>
//                                     )}
//                                 </div>

//                                 {/* Notes */}
//                                 <textarea
//                                     value={currentNotes}
//                                     onChange={(e) => {
//                                         e.stopPropagation();
//                                         if (savedPhoto && !localPhoto) {
//                                             setSavedNoteOverrides((prev) => ({
//                                                 ...prev,
//                                                 [slot.type]: e.target.value,
//                                             }));
//                                         } else {
//                                             handleNotesChange(
//                                                 slot.type,
//                                                 e.target.value,
//                                             );
//                                         }
//                                     }}
//                                     onClick={(e) => e.stopPropagation()}
//                                     placeholder={slot.placeholder}
//                                     maxLength={500}
//                                     rows={3}
//                                     className="w-full p-3 text-sm text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50"
//                                 />

//                                 {/* Hidden file input */}
//                                 <input
//                                     ref={(el) => {
//                                         inputRefs.current[slot.type] = el;
//                                     }}
//                                     type="file"
//                                     accept="image/*"
//                                     capture="environment"
//                                     className="hidden"
//                                     onChange={(e) =>
//                                         handleFileChange(e, slot.type)
//                                     }
//                                 />
//                             </div>
//                         )}
//                     </div>
//                 );
//             })}
//         </div>
//     );
// }
