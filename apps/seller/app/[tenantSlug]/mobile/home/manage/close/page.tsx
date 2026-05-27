"use client";

import { useState, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSummaries } from "@/lib/hooks/summaries/useDailySummaries";
import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
import { useSummaryPhotosById } from "@/lib/hooks/summaries/useSummaryPhotosById";
import {
    PhotoType,
    SlottedPhoto,
    SavedSlottedPhoto,
} from "@tea-pos/features/summaries/photos-schema";
import { DailyStepHeader } from "../_components/daily/DailyStepHeader";
import { SinglePhotoStep } from "../_components/daily/SinglePhotoStep";
import { PHOTO_SLOTS } from "@tea-pos/features/shared/photo-slots";
import { ReviewStep } from "../_components/daily/ReviewStep";
import { SimpleCashStep } from "../_components/daily/SimpleCashStep";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/lib/context/ToastContext";
import { isEnabled } from "@tea-pos/features/shared/features";
import { useMobileFooterSlot } from "../../../components/MobileFooterSlotContext";

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
    { label: "Review" },
];

const PHOTO_STEP_COUNT = 5;
const STEP_CASH = 5;
const STEP_REVIEW = 6;

const QUANTITY_REQUIRED_SLOTS: PhotoType[] = ["closing:cups", "closing:tea"];

// ============================================================================
// PAGE
// ============================================================================

export default function ManageCloseDayPage() {
    const searchParams = useSearchParams();
    const { url } = useTenantSlug();
    const { selectedStoreId, selectedStore } = useStore();
    const { mutate: mutateSession } = useSession(selectedStoreId);
    const { showToast } = useToast();

    const paramSummaryId = searchParams.get("summaryId");
    const paramMonth = searchParams.get("month");

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const currentMonth = useMemo(
        () => paramMonth ?? new Date().toISOString().slice(0, 7),
        [paramMonth],
    );

    const {
        data: summariesData,
        updateSummary,
        mutate,
        isLoading: summariesLoading,
    } = useSummaries(selectedStoreId, currentMonth);

    const summary = useMemo(
        () =>
            paramSummaryId
                ? summariesData?.summaries.find((s) => s.id === paramSummaryId)
                : summariesData?.summaries.find((s) => s.date === todayStr && !s.closedAt),
        [summariesData?.summaries, paramSummaryId, todayStr],
    );
    const summaryId = summary?.id ?? null;

    const STEP_KEY = summaryId ? `close-day-step-${summaryId}` : null;

    const { photos: fetchedPhotos, mutate: mutatePhotos } = useSummaryPhotosById(summaryId);
    const { uploadPhoto, deletePhoto, updatePhotoQuantity } = useSummaryPhotos();

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

    const [currentStep, setCurrentStep] = useState<number>(() => {
        if (!STEP_KEY || typeof window === "undefined") return 0;
        return parseInt(localStorage.getItem(STEP_KEY) ?? "0");
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [photos, setPhotos] = useState<SlottedPhoto[]>([]);
    const [quantities, setQuantities] = useState<
        Record<string, { value: number; unit: string } | null>
    >({});
    const [actualCash, setActualCash] = useState(0);
    const [cashConfirmed, setCashConfirmed] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (!summary) return;
        if (summary.actualCash) setActualCash(summary.actualCash);
    }, [summary?.id]);

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

        if (currentStep < PHOTO_STEP_COUNT && summaryId && selectedStoreId) {
            const slot = PHOTO_SLOTS[currentStep];
            const localPhoto = getSlotPhoto(slot.type);
            const existingSaved = getSavedSlotPhoto(slot.type);
            const currentQuantity = quantities[slot.type] ?? existingSaved?.quantity ?? null;

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
                    setPhotos((prev) => prev.filter((p) => p.type !== slot.type));
                    setQuantities((prev) => {
                        const next = { ...prev };
                        delete next[slot.type];
                        return next;
                    });
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to upload photo");
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            } else if (existingSaved && quantities[slot.type] !== undefined) {
                setIsUploading(true);
                try {
                    await updatePhotoQuantity(existingSaved.id, currentQuantity);
                    await mutatePhotos();
                    setQuantities((prev) => {
                        const next = { ...prev };
                        delete next[slot.type];
                        return next;
                    });
                } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to update quantity");
                    setIsUploading(false);
                    return;
                }
                setIsUploading(false);
            }
        }

        if (currentStep === STEP_CASH && summaryId) {
            setIsUploading(true);
            try {
                await updateSummary(summaryId, { actualCash, closingCashBreakdown: null });
                await mutatePhotos();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save cash");
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

    const handleConfirm = useCallback(async () => {
        if (!summaryId || !summary) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await updateSummary(summaryId, {
                actualCash,
                closedAt: new Date().toISOString(),
            });
            mutateSession();
            if (STEP_KEY) localStorage.removeItem(STEP_KEY);
            showToast("Day closed successfully!", "success");
            navigation.push(url(paramSummaryId ? "/mobile/analytics" : "/mobile/home/manage"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to close day");
            showToast(err instanceof Error ? err.message : "Failed to close day", "error");
        } finally {
            setIsSubmitting(false);
        }
    }, [summaryId, summary, actualCash, updateSummary, url, STEP_KEY, paramSummaryId]);

    const handleSavedPhotoDelete = useCallback(
        async (id: string) => {
            await deletePhoto(id);
            await mutatePhotos();
        },
        [deletePhoto, mutatePhotos],
    );

    const { setFooterSlot } = useMobileFooterSlot();

    const storeName = selectedStore?.name ?? "Unknown Store";
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === STEPS.length - 1;
    const isBusy = isUploading || isSubmitting;

    const currentSlot = currentStep < PHOTO_STEP_COUNT ? PHOTO_SLOTS[currentStep] : null;
    const currentStepHasPhoto = currentSlot
        ? !!getSlotPhoto(currentSlot.type) || !!getSavedSlotPhoto(currentSlot.type)
        : true;
    const currentStepNeedsQuantity = currentSlot
        ? QUANTITY_REQUIRED_SLOTS.includes(currentSlot.type)
        : false;
    const currentStepHasQuantity = currentSlot ? !!getSlotQuantity(currentSlot.type) : true;

    const skipPhotos = isEnabled("skip-photos");

    const nextDisabled =
        isBusy ||
        (currentStep < PHOTO_STEP_COUNT && !currentStepHasPhoto && !skipPhotos) ||
        (currentStepNeedsQuantity && !currentStepHasQuantity && !skipPhotos) ||
        (currentStep === STEP_CASH && !cashConfirmed) ||
        (currentStep === STEP_REVIEW && !confirmed);

    useLayoutEffect(() => {
        if (summariesLoading || !summary) {
            return () => setFooterSlot(null);
        }
        setFooterSlot(
            <div className="bg-white border-t border-gray-200 p-4 pb-8 flex gap-3">
                {!isFirstStep && (
                    <button
                        onClick={handleBack}
                        disabled={isBusy}
                        className="flex items-center justify-center px-5 py-4 rounded-xl bg-gray-100 text-gray-900 font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        Previous
                    </button>
                )}
                {isLastStep ? (
                    <button
                        onClick={handleConfirm}
                        disabled={isBusy || !confirmed}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-red-500 text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        {isSubmitting ? <><Loader2 size={18} className="animate-spin" />Closing...</> : "Close Day"}
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        disabled={nextDisabled}
                        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        {isUploading ? <><Loader2 size={18} className="animate-spin" />Uploading...</> : "Next"}
                    </button>
                )}
            </div>
        );
        return () => setFooterSlot(null);
    }, [summariesLoading, summary, isFirstStep, isLastStep, isBusy, isSubmitting, isUploading, confirmed, nextDisabled, handleBack, handleNext, handleConfirm, setFooterSlot]);

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
                <p className="text-gray-500 text-sm">No open summary found.</p>
                <button
                    onClick={() =>
                        navigation.push(
                            url(paramSummaryId ? "/mobile/analytics" : "/mobile/home/manage"),
                        )
                    }
                    className="mt-4 text-brand text-sm font-medium"
                >
                    Go back
                </button>
            </div>
        );
    }

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
                                onPhotoChange={(p) => handlePhotoChange(p, slot.type)}
                                onSavedPhotoDelete={async () => {
                                    const saved = getSavedSlotPhoto(slot.type);
                                    if (saved) await handleSavedPhotoDelete(saved.id);
                                }}
                                onQuantityChange={(q) => handleQuantityChange(slot.type, q)}
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
                {currentStep === STEP_REVIEW && (
                    <ReviewStep
                        summary={summary}
                        photos={photos}
                        savedPhotos={savedPhotos}
                        notes=""
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

        </div>
    );
}
