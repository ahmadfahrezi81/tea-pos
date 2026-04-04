// // app/[tenantSlug]/mobile/analytics/daily/close/page.tsx
// "use client";

// import { useState, useCallback } from "react";
// import { useSearchParams } from "next/navigation";
// import { useStore } from "@/lib/context/StoreContext";
// import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
// import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
// import { CashBreakdown } from "@/lib/schemas/daily-summaries";
// import { PhotoType } from "@/lib/schemas/daily-summary-photos";
// import { DailyStepHeader } from "../_components/DailyStepHeader";
// import {
//     PhotoStep,
//     SlottedPhoto,
//     SavedSlottedPhoto,
//     PHOTO_SLOTS,
// } from "../_components/PhotoStep";
// import { CashCountStep } from "../_components/CashCountStep";
// import { NotesStep } from "../_components/NotesStep";
// import { ReviewStep } from "../_components/ReviewStep";
// import { useTenantSlug } from "@/lib/tenant-url";
// import { navigation } from "@/lib/utils/navigation";
// import { Loader2 } from "lucide-react";

// // ============================================================================
// // CONSTANTS
// // ============================================================================

// const STEPS = [
//     { label: "Photo" },
//     { label: "Cash" },
//     { label: "Notes" },
//     { label: "Review" },
// ];

// const EMPTY_BREAKDOWN: CashBreakdown = {
//     100000: 0,
//     50000: 0,
//     20000: 0,
//     10000: 0,
//     5000: 0,
//     2000: 0,
//     1000: 0,
//     500: 0,
//     200: 0,
//     100: 0,
// };

// // ============================================================================
// // PAGE
// // ============================================================================

// export default function CloseDayPage() {
//     const searchParams = useSearchParams();
//     const { url } = useTenantSlug();
//     const { selectedStoreId, selectedStore } = useStore();

//     const summaryId = searchParams.get("summaryId");
//     const STEP_KEY = summaryId ? `close-day-step-${summaryId}` : null;

//     const {
//         data: summariesData,
//         updateSummary,
//         mutate,
//     } = useSummaries(selectedStoreId, new Date().toISOString().slice(0, 7));
//     const { uploadPhoto, deletePhoto } = useSummaryPhotos();

//     const summary = summariesData?.summaries.find((s) => s.id === summaryId);

//     // Already uploaded photos from DB — closing slot types only
//     const savedPhotos: SavedSlottedPhoto[] = (summary?.photos ?? [])
//         .filter((p) => p.type.startsWith("closing:"))
//         .map((p) => ({
//             id: p.id,
//             type: p.type as PhotoType,
//             url: p.url,
//             notes: p.notes ?? null, // ← add this
//         }));
//     // ─── Step state ────────────────────────────────────────────────────
//     const [currentStep, setCurrentStep] = useState<number>(() => {
//         if (!STEP_KEY || typeof window === "undefined") return 0;
//         return parseInt(localStorage.getItem(STEP_KEY) ?? "0");
//     });

//     const [isUploading, setIsUploading] = useState(false);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [error, setError] = useState<string | null>(null);

//     // ─── Form state ────────────────────────────────────────────────────
//     const [photos, setPhotos] = useState<SlottedPhoto[]>([]);
//     const [breakdown, setBreakdown] = useState<CashBreakdown>(EMPTY_BREAKDOWN);
//     const [notes, setNotes] = useState("");

//     // ─── All 5 slots complete check ────────────────────────────────────
//     const allPhotosComplete = PHOTO_SLOTS.every(
//         (slot) =>
//             photos.some((p) => p.type === slot.type) ||
//             savedPhotos.some((p) => p.type === slot.type),
//     );

//     // ─── Step navigation ───────────────────────────────────────────────
//     const goToStep = useCallback(
//         (step: number) => {
//             setCurrentStep(step);
//             if (STEP_KEY) localStorage.setItem(STEP_KEY, String(step));
//         },
//         [STEP_KEY],
//     );

//     const handleBack = useCallback(() => {
//         goToStep(currentStep - 1);
//     }, [currentStep, goToStep]);

//     const handleNext = useCallback(async () => {
//         setError(null);

//         // Step 0 — upload slotted photos, block until done
//         if (
//             currentStep === 0 &&
//             photos.length > 0 &&
//             summaryId &&
//             selectedStoreId
//         ) {
//             setIsUploading(true);
//             try {
//                 await Promise.all(
//                     photos.map((p) =>
//                         uploadPhoto({
//                             file: p.file,
//                             dailySummaryId: summaryId,
//                             storeId: selectedStoreId,
//                             type: p.type,
//                             notes: p.notes ?? null, // ← add this
//                         }),
//                     ),
//                 );
//                 setPhotos([]);
//             } catch (err) {
//                 setError(
//                     err instanceof Error
//                         ? err.message
//                         : "Failed to upload photos",
//                 );
//                 setIsUploading(false);
//                 return;
//             }
//             setIsUploading(false);
//         }

//         goToStep(currentStep + 1);
//     }, [
//         currentStep,
//         photos,
//         summaryId,
//         selectedStoreId,
//         uploadPhoto,
//         goToStep,
//     ]);

//     // ─── Final submit ──────────────────────────────────────────────────
//     const handleConfirm = useCallback(async () => {
//         if (!summaryId || !summary) return;
//         setIsSubmitting(true);
//         setError(null);

//         try {
//             const actualCash = Object.entries(breakdown).reduce(
//                 (sum, [denom, count]) => sum + parseInt(denom) * (count ?? 0),
//                 0,
//             );

//             await updateSummary(summaryId, {
//                 actualCash,
//                 closingCashBreakdown: breakdown,
//                 notes: notes || null,
//                 closedAt: new Date().toISOString(),
//             });

//             if (STEP_KEY) localStorage.removeItem(STEP_KEY);
//             navigation.push(url("/mobile/analytics"));
//         } catch (err) {
//             setError(
//                 err instanceof Error ? err.message : "Failed to close day",
//             );
//         } finally {
//             setIsSubmitting(false);
//         }
//     }, [summaryId, summary, breakdown, notes, updateSummary, url, STEP_KEY]);

//     // ─── Delete saved photo ────────────────────────────────────────────
//     const handleSavedPhotoDelete = useCallback(
//         async (id: string) => {
//             try {
//                 await deletePhoto(id);
//                 await mutate();
//             } catch (err) {
//                 console.error("Failed to delete photo:", err);
//             }
//         },
//         [deletePhoto, mutate],
//     );

//     // ─── Guards ────────────────────────────────────────────────────────
//     if (!summaryId || !summary) {
//         return (
//             <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
//                 <p className="text-gray-500 text-sm">
//                     No open summary found for today.
//                 </p>
//                 <button
//                     onClick={() => navigation.push(url("/mobile/analytics"))}
//                     className="mt-4 text-brand text-sm font-medium"
//                 >
//                     Go back
//                 </button>
//             </div>
//         );
//     }

//     const storeName = selectedStore?.name ?? "Unknown Store";
//     const isFirstStep = currentStep === 0;
//     const isLastStep = currentStep === STEPS.length - 1;
//     const isBusy = isUploading || isSubmitting;
//     const nextDisabled = isBusy || (currentStep === 0 && !allPhotosComplete);

//     // ─── Render ────────────────────────────────────────────────────────
//     return (
//         <div className="flex flex-col min-h-screen bg-gray-50">
//             <DailyStepHeader
//                 steps={STEPS}
//                 currentStep={currentStep}
//                 onStepClick={goToStep}
//             />

//             <div className="flex-1 overflow-y-auto pb-32 pt-2">
//                 {currentStep === 0 && (
//                     <PhotoStep
//                         photos={photos}
//                         onPhotosChange={setPhotos}
//                         savedPhotos={savedPhotos}
//                         onSavedPhotoDelete={handleSavedPhotoDelete}
//                     />
//                 )}
//                 {currentStep === 1 && (
//                     <CashCountStep
//                         breakdown={breakdown}
//                         onBreakdownChange={setBreakdown}
//                         expectedCash={summary.expectedCash}
//                     />
//                 )}
//                 {currentStep === 2 && (
//                     <NotesStep notes={notes} onNotesChange={setNotes} />
//                 )}
//                 {currentStep === 3 && (
//                     <ReviewStep
//                         summary={summary}
//                         photos={photos}
//                         savedPhotos={savedPhotos}
//                         breakdown={breakdown}
//                         notes={notes}
//                         storeName={storeName}
//                     />
//                 )}
//             </div>

//             {error && (
//                 <div className="fixed bottom-28 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
//                     {error}
//                 </div>
//             )}

//             {/* Bottom navigation */}
//             <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-6 flex gap-3">
//                 {!isFirstStep && (
//                     <button
//                         onClick={handleBack}
//                         disabled={isBusy}
//                         className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-900 font-medium text-md active:scale-95 transition-transform disabled:opacity-60"
//                     >
//                         Previous
//                     </button>
//                 )}

//                 {isLastStep ? (
//                     <button
//                         onClick={handleConfirm}
//                         disabled={isBusy}
//                         className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
//                     >
//                         {isSubmitting ? (
//                             <>
//                                 <Loader2 size={18} className="animate-spin" />
//                                 Closing...
//                             </>
//                         ) : (
//                             "Close Day"
//                         )}
//                     </button>
//                 ) : (
//                     <button
//                         onClick={handleNext}
//                         disabled={nextDisabled}
//                         className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-xl bg-brand text-white font-semibold text-md active:scale-95 transition-transform disabled:opacity-30 disabled:bg-gray-300 disabled:text-gray-400"
//                     >
//                         {isUploading ? (
//                             <>
//                                 <Loader2 size={18} className="animate-spin" />
//                                 Uploading...
//                             </>
//                         ) : (
//                             "Next"
//                         )}
//                     </button>
//                 )}
//             </div>
//         </div>
//     );
// }

// app/[tenantSlug]/mobile/analytics/daily/close/page.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
import { CashBreakdown } from "@/lib/schemas/daily-summaries";
import { PhotoType } from "@/lib/schemas/daily-summary-photos";
import { DailyStepHeader } from "../_components/DailyStepHeader";
import { SinglePhotoStep } from "../_components/SinglePhotoStep";
import {
    SlottedPhoto,
    SavedSlottedPhoto,
    PHOTO_SLOTS,
} from "../_components/PhotoStep";
import { CashCountStep } from "../_components/CashCountStep";
import { NotesStep } from "../_components/NotesStep";
import { ReviewStep } from "../_components/ReviewStep";
import { useTenantSlug } from "@/lib/tenant-url";
import { navigation } from "@/lib/utils/navigation";
import { Loader2 } from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS = [
    { label: "Ice" },
    { label: "Syrup" },
    { label: "Bags" },
    { label: "Cups" },
    { label: "Waste" },
    { label: "Cash" },
    { label: "Notes" },
    { label: "Review" },
];

const PHOTO_STEP_COUNT = 5;
const STEP_CASH = 5;
const STEP_NOTES = 6;
const STEP_REVIEW = 7;

const EMPTY_BREAKDOWN: CashBreakdown = {
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
};

// ============================================================================
// PAGE
// ============================================================================

export default function CloseDayPage() {
    const searchParams = useSearchParams();
    const { url } = useTenantSlug();
    const { selectedStoreId, selectedStore } = useStore();

    const summaryId = searchParams.get("summaryId");
    const STEP_KEY = summaryId ? `close-day-step-${summaryId}` : null;

    const {
        data: summariesData,
        updateSummary,
        mutate,
        isLoading: summariesLoading,
    } = useSummaries(selectedStoreId, new Date().toISOString().slice(0, 7));

    const { uploadPhoto, deletePhoto } = useSummaryPhotos();

    const summary = summariesData?.summaries.find((s) => s.id === summaryId);

    const savedPhotos: SavedSlottedPhoto[] = (summary?.photos ?? [])
        .filter((p) => p.type.startsWith("closing:"))
        .map((p) => ({
            id: p.id,
            type: p.type as PhotoType,
            url: p.url,
            notes: p.notes ?? null,
        }));

    // ─── Step state ────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState<number>(() => {
        if (!STEP_KEY || typeof window === "undefined") return 0;
        return parseInt(localStorage.getItem(STEP_KEY) ?? "0");
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Form state ────────────────────────────────────────────────────
    const [photos, setPhotos] = useState<SlottedPhoto[]>([]);
    const [breakdown, setBreakdown] = useState<CashBreakdown>(EMPTY_BREAKDOWN);
    const [notes, setNotes] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    // ─── Seed breakdown and notes from summary once loaded ─────────────
    useEffect(() => {
        if (!summary) return;
        if (summary.closingCashBreakdown)
            setBreakdown(summary.closingCashBreakdown);
        if (summary.notes) setNotes(summary.notes);
    }, [summary?.id]);

    // ─── Helpers ───────────────────────────────────────────────────────
    const getSlotPhoto = (type: PhotoType) =>
        photos.find((p) => p.type === type);
    const getSavedSlotPhoto = (type: PhotoType) =>
        savedPhotos.find((p) => p.type === type);

    const handlePhotoChange = (photo: SlottedPhoto | null, type: PhotoType) => {
        if (photo === null) {
            setPhotos((prev) => prev.filter((p) => p.type !== type));
        } else {
            setPhotos((prev) => [
                ...prev.filter((p) => p.type !== type),
                photo,
            ]);
        }
    };

    const handleNotesChange = (type: PhotoType, notes: string) => {
        setPhotos((prev) =>
            prev.map((p) => (p.type === type ? { ...p, notes } : p)),
        );
    };

    // ─── Step navigation ───────────────────────────────────────────────
    const goToStep = useCallback(
        (step: number) => {
            setCurrentStep(step);
            if (STEP_KEY) localStorage.setItem(STEP_KEY, String(step));
        },
        [STEP_KEY],
    );

    const handleBack = useCallback(() => {
        if (currentStep === STEP_REVIEW) setConfirmed(false);
        goToStep(currentStep - 1);
    }, [currentStep, goToStep]);

    const handleNext = useCallback(async () => {
        setError(null);

        // ─── Photo steps 0-4 ───────────────────────────────────────────
        if (currentStep < PHOTO_STEP_COUNT && summaryId && selectedStoreId) {
            const slot = PHOTO_SLOTS[currentStep];
            const localPhoto = getSlotPhoto(slot.type);

            if (localPhoto) {
                setIsUploading(true);
                try {
                    const existingSaved = getSavedSlotPhoto(slot.type);
                    if (existingSaved) await deletePhoto(existingSaved.id);

                    await uploadPhoto({
                        file: localPhoto.file,
                        dailySummaryId: summaryId,
                        storeId: selectedStoreId,
                        type: localPhoto.type,
                        notes: localPhoto.notes ?? null,
                    });

                    await mutate();
                    setPhotos((prev) =>
                        prev.filter((p) => p.type !== slot.type),
                    );
                } catch (err) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to upload photo",
                    );
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            }
        }

        // ─── Cash step ─────────────────────────────────────────────────
        if (currentStep === STEP_CASH && summaryId) {
            setIsUploading(true);
            try {
                const actualCash = Object.entries(breakdown).reduce(
                    (sum, [denom, count]) =>
                        sum + parseInt(denom) * (count ?? 0),
                    0,
                );
                await updateSummary(summaryId, {
                    actualCash,
                    closingCashBreakdown: breakdown,
                });
                await mutate();
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to save cash",
                );
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        // ─── Notes step ────────────────────────────────────────────────
        if (currentStep === STEP_NOTES && summaryId) {
            setIsUploading(true);
            try {
                await updateSummary(summaryId, { notes: notes || null });
                await mutate();
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : "Failed to save notes",
                );
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        goToStep(currentStep + 1);
    }, [
        currentStep,
        photos,
        breakdown,
        notes,
        summaryId,
        selectedStoreId,
        uploadPhoto,
        deletePhoto,
        updateSummary,
        mutate,
        goToStep,
    ]);

    // ─── Final submit ──────────────────────────────────────────────────
    const handleConfirm = useCallback(async () => {
        if (!summaryId || !summary) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const actualCash = Object.entries(breakdown).reduce(
                (sum, [denom, count]) => sum + parseInt(denom) * (count ?? 0),
                0,
            );

            await updateSummary(summaryId, {
                actualCash,
                closingCashBreakdown: breakdown,
                notes: notes || null,
                closedAt: new Date().toISOString(),
            });

            if (STEP_KEY) localStorage.removeItem(STEP_KEY);
            navigation.push(url("/mobile/analytics"));
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to close day",
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [summaryId, summary, breakdown, notes, updateSummary, url, STEP_KEY]);

    // ─── Delete saved photo ────────────────────────────────────────────
    const handleSavedPhotoDelete = useCallback(
        async (id: string) => {
            await deletePhoto(id);
            await mutate();
        },
        [deletePhoto, mutate],
    );

    // ─── Guards ────────────────────────────────────────────────────────
    if (summariesLoading) {
        return (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!summaryId || !summary) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <p className="text-gray-500 text-sm">
                    No open summary found for today.
                </p>
                <button
                    onClick={() => navigation.push(url("/mobile/analytics"))}
                    className="mt-4 text-brand text-sm font-medium"
                >
                    Go back
                </button>
            </div>
        );
    }

    const storeName = selectedStore?.name ?? "Unknown Store";
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === STEPS.length - 1;
    const isBusy = isUploading || isSubmitting;

    const currentSlot =
        currentStep < PHOTO_STEP_COUNT ? PHOTO_SLOTS[currentStep] : null;
    const currentStepHasPhoto = currentSlot
        ? !!getSlotPhoto(currentSlot.type) ||
          !!getSavedSlotPhoto(currentSlot.type)
        : true;

    const cashTotal = Object.entries(breakdown).reduce(
        (sum, [denom, count]) => sum + parseInt(denom) * (count ?? 0),
        0,
    );

    const nextDisabled =
        isBusy ||
        (currentStep < PHOTO_STEP_COUNT && !currentStepHasPhoto) ||
        (currentStep === STEP_CASH && cashTotal === 0) ||
        (currentStep === STEP_REVIEW && !confirmed); // ← new

    // ─── Render ────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col bg-gray-50">
            <DailyStepHeader
                steps={STEPS}
                currentStep={currentStep}
                onStepClick={goToStep}
            />
            <div className="flex-1 overflow-y-auto pt-2">
                {currentStep < PHOTO_STEP_COUNT &&
                    (() => {
                        const slot = PHOTO_SLOTS[currentStep];
                        return (
                            <SinglePhotoStep
                                key={slot.type}
                                label={slot.label}
                                placeholder={slot.placeholder}
                                type={slot.type}
                                photo={getSlotPhoto(slot.type)}
                                savedPhoto={getSavedSlotPhoto(slot.type)}
                                onPhotoChange={(p) =>
                                    handlePhotoChange(p, slot.type)
                                }
                                onSavedPhotoDelete={async () => {
                                    const saved = getSavedSlotPhoto(slot.type);
                                    if (saved)
                                        await handleSavedPhotoDelete(saved.id);
                                }}
                                onNotesChange={(n) =>
                                    handleNotesChange(slot.type, n)
                                }
                            />
                        );
                    })()}

                {currentStep === STEP_CASH && (
                    <CashCountStep
                        breakdown={breakdown}
                        onBreakdownChange={setBreakdown}
                        expectedCash={summary.expectedCash}
                    />
                )}
                {currentStep === STEP_NOTES && (
                    <NotesStep notes={notes} onNotesChange={setNotes} />
                )}
                {currentStep === STEP_REVIEW && (
                    <ReviewStep
                        summary={summary}
                        photos={photos}
                        savedPhotos={savedPhotos}
                        breakdown={breakdown}
                        notes={notes}
                        storeName={storeName}
                        onConfirmChange={setConfirmed} // ← new
                    />
                )}
            </div>

            {error && (
                <div className="fixed bottom-28 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
                    {error}
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 px-4 pb-6 flex gap-3">
                {!isFirstStep && (
                    <button
                        onClick={handleBack}
                        disabled={isBusy}
                        className="flex items-center justify-center gap-1 px-5 py-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-900 font-medium text-md active:scale-95 transition-transform disabled:opacity-60"
                    >
                        Previous
                    </button>
                )}

                {isLastStep ? (
                    <button
                        onClick={handleConfirm}
                        disabled={isBusy || !confirmed}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white font-semibold text-base active:scale-95 transition-transform disabled:opacity-30 disabled:bg-gray-300 disabled:text-gray-400"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Closing...
                            </>
                        ) : (
                            "Close Day"
                        )}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={nextDisabled}
                        className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-brand text-white font-semibold text-md active:scale-95 transition-transform disabled:opacity-30 disabled:bg-gray-300 disabled:text-gray-400"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            "Next"
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
