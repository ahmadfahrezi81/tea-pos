"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/client/context/StoreContext";
import { useSummaries } from "@/lib/client/hooks/summaries/useDailySummaries";
import { useSummaryPhotos } from "@/lib/client/hooks/summaries/useSummaryPhotos";
import { useSummaryPhotosById } from "@/lib/client/hooks/summaries/useSummaryPhotosById";
import {
    PhotoType,
    SlottedPhoto,
    SavedSlottedPhoto,
} from "@/lib/shared/schemas/daily-summary-photos";
import { DailyStepHeader } from "../_components/DailyStepHeader";
import { SinglePhotoStep } from "../_components/SinglePhotoStep";
import { PHOTO_SLOTS } from "@/lib/shared/config/photo-slots";
import { NotesStep } from "../_components/NotesStep";
import { ReviewStep } from "../_components/ReviewStep";
import { SimpleCashStep } from "../_components/SimpleCashStep";
import { useTenantSlug } from "@/lib/server/config/tenant-url";
import { navigation } from "@/lib/shared/utils/navigation";
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

const QUANTITY_REQUIRED_SLOTS: PhotoType[] = ["closing:cups", "closing:tea"];

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

    const { photos: fetchedPhotos, mutate: mutatePhotos } =
        useSummaryPhotosById(summaryId);
    const { uploadPhoto, deletePhoto, updatePhotoQuantity } =
        useSummaryPhotos();

    const summary = summariesData?.summaries.find((s) => s.id === summaryId);

    // ─── Stable savedPhotos via useMemo ───────────────────────────────
    const savedPhotos: SavedSlottedPhoto[] = useMemo(
        () =>
            fetchedPhotos
                .filter((p) => p.type.startsWith("closing:"))
                .map((p) => ({
                    id: p.id,
                    type: p.type as PhotoType,
                    url: p.url,
                    quantity: p.quantity ?? null,
                })),
        [fetchedPhotos],
    );

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
    const [quantities, setQuantities] = useState<
        Record<string, { value: number; unit: string } | null>
    >({});
    const [actualCash, setActualCash] = useState(0);
    const [cashConfirmed, setCashConfirmed] = useState(false);
    const [notes, setNotes] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    // ─── Seed from summary once loaded ────────────────────────────────
    useEffect(() => {
        if (!summary) return;
        if (summary.notes) setNotes(summary.notes);
        if (summary.actualCash) setActualCash(summary.actualCash);
    }, [summary?.id]);

    // ─── Helpers ───────────────────────────────────────────────────────
    const getSlotPhoto = useCallback(
        (type: PhotoType) => photos.find((p) => p.type === type),
        [photos],
    );

    const getSavedSlotPhoto = useCallback(
        (type: PhotoType) => savedPhotos.find((p) => p.type === type),
        [savedPhotos],
    );

    const getSlotQuantity = useCallback(
        (type: PhotoType) =>
            quantities[type] ?? getSavedSlotPhoto(type)?.quantity ?? null,
        [quantities, getSavedSlotPhoto],
    );

    const handlePhotoChange = useCallback(
        (photo: SlottedPhoto | null, type: PhotoType) => {
            setPhotos((prev) =>
                photo === null
                    ? prev.filter((p) => p.type !== type)
                    : [...prev.filter((p) => p.type !== type), photo],
            );
        },
        [],
    );

    const handleQuantityChange = useCallback(
        (type: PhotoType, quantity: { value: number; unit: string } | null) => {
            setQuantities((prev) => ({ ...prev, [type]: quantity }));
        },
        [],
    );

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
        if (currentStep === STEP_CASH) setCashConfirmed(false);
        goToStep(currentStep - 1);
    }, [currentStep, goToStep]);

    const handleNext = useCallback(async () => {
        setError(null);

        // ─── Photo steps 0-4 ───────────────────────────────────────────
        if (currentStep < PHOTO_STEP_COUNT && summaryId && selectedStoreId) {
            const slot = PHOTO_SLOTS[currentStep];
            const localPhoto = getSlotPhoto(slot.type);
            const existingSaved = getSavedSlotPhoto(slot.type);
            const currentQuantity =
                quantities[slot.type] ?? existingSaved?.quantity ?? null;

            if (localPhoto) {
                setIsUploading(true);
                try {
                    if (existingSaved) await deletePhoto(existingSaved.id);
                    await uploadPhoto({
                        file: localPhoto.file,
                        dailySummaryId: summaryId,
                        storeId: selectedStoreId,
                        type: localPhoto.type,
                        quantity: currentQuantity,
                    });
                    await mutatePhotos();
                    setPhotos((prev) =>
                        prev.filter((p) => p.type !== slot.type),
                    );
                    setQuantities((prev) => {
                        const next = { ...prev };
                        delete next[slot.type];
                        return next;
                    });
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
            } else if (existingSaved && quantities[slot.type] !== undefined) {
                setIsUploading(true);
                try {
                    await updatePhotoQuantity(
                        existingSaved.id,
                        currentQuantity,
                    );
                    await mutatePhotos();
                    setQuantities((prev) => {
                        const next = { ...prev };
                        delete next[slot.type];
                        return next;
                    });
                } catch (err) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to update quantity",
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
                await updateSummary(summaryId, {
                    actualCash,
                    closingCashBreakdown: null,
                });
                await mutatePhotos();
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
                await mutatePhotos();
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
        quantities,
        actualCash,
        notes,
        summaryId,
        selectedStoreId,
        uploadPhoto,
        deletePhoto,
        updatePhotoQuantity,
        updateSummary,
        mutate,
        goToStep,
        getSlotPhoto,
        getSavedSlotPhoto,
    ]);

    // ─── Final submit ──────────────────────────────────────────────────
    const handleConfirm = useCallback(async () => {
        if (!summaryId || !summary) return;
        setIsSubmitting(true);
        setError(null);

        try {
            await updateSummary(summaryId, {
                actualCash,
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
    }, [summaryId, summary, actualCash, notes, updateSummary, url, STEP_KEY]);

    // ─── Delete saved photo ────────────────────────────────────────────
    const handleSavedPhotoDelete = useCallback(
        async (id: string) => {
            await deletePhoto(id);
            await mutatePhotos();
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
    const currentStepNeedsQuantity = currentSlot
        ? QUANTITY_REQUIRED_SLOTS.includes(currentSlot.type)
        : false;
    const currentStepHasQuantity = currentSlot
        ? !!getSlotQuantity(currentSlot.type)
        : true;

    const nextDisabled =
        isBusy ||
        (currentStep < PHOTO_STEP_COUNT && !currentStepHasPhoto) ||
        (currentStepNeedsQuantity && !currentStepHasQuantity) ||
        (currentStep === STEP_CASH && !cashConfirmed) ||
        (currentStep === STEP_REVIEW && !confirmed);

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
                                type={slot.type}
                                photo={getSlotPhoto(slot.type)}
                                savedPhoto={getSavedSlotPhoto(slot.type)}
                                quantity={getSlotQuantity(slot.type)}
                                onPhotoChange={(p) =>
                                    handlePhotoChange(p, slot.type)
                                }
                                onSavedPhotoDelete={async () => {
                                    const saved = getSavedSlotPhoto(slot.type);
                                    if (saved)
                                        await handleSavedPhotoDelete(saved.id);
                                }}
                                onQuantityChange={(q) =>
                                    handleQuantityChange(slot.type, q)
                                }
                            />
                        );
                    })()}

                {currentStep === STEP_CASH && (
                    <SimpleCashStep
                        expectedCash={summary.expectedCash}
                        initialValue={actualCash || summary.expectedCash}
                        onActualCashChange={setActualCash}
                        onConfirmedChange={setCashConfirmed}
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
                        notes={notes}
                        storeName={storeName}
                        onConfirmChange={setConfirmed}
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
