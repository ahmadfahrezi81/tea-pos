"use client";

import { useState, useMemo } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { isEnabled } from "@tea-pos/features/shared/features";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

export default function OpenStorePage() {
    const { selectedStoreId, selectedStore } = useStore();
    const { url } = useTenantSlug();
    const { gate, openStore, resumeSession } = useSession(selectedStoreId);
    const { uploadPhoto } = useSummaryPhotos();

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedStoreId || (!photo && !skipPhotos)) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let dailySummaryId: string;
            if (gate === "no_summary") {
                const result = await openStore({ date: todayStr, openingBalance });
                dailySummaryId = result.dailySummary.id;
            } else if (gate === "no_session") {
                const result = await resumeSession();
                dailySummaryId = result.session.dailySummaryId;
            } else {
                return;
            }

            if (photo) {
                await uploadPhoto({ file: photo.file, dailySummaryId, storeId: selectedStoreId, type: "opening" });
            }
            navigation.push(url("/mobile/home/manage"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to open store");
        } finally {
            setIsSubmitting(false);
        }
    };

    const skipPhotos = isEnabled("skip-photos");

    const canSubmit =
        (!!photo || skipPhotos) &&
        !isSubmitting &&
        !!selectedStoreId &&
        (gate === "no_summary" || gate === "no_session");

    return (
        <div className="space-y-4 pb-4">
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Store</p>
                    <p className="font-semibold text-gray-800 mt-0.5">{selectedStore?.name ?? "Unknown Store"}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
            </div>

            {gate !== "no_session" && (
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <label className="block">
                        <span className="text-sm font-medium text-gray-700">Opening Balance</span>
                        <span className="text-xs text-gray-400 ml-1">(optional)</span>
                        <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1000}
                            value={openingBalance || ""}
                            onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none text-lg"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">Cash on hand at the start of the day</p>
                    </label>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Opening Photo</span>
                    {skipPhotos ? (
                        <span className="text-xs text-gray-400 font-medium">(optional)</span>
                    ) : (
                        <span className="text-xs text-red-400 font-medium">Required</span>
                    )}
                </div>
                <PhotoPicker
                    previewUrl={photo?.preview ?? null}
                    onCapture={(file, url) => {
                        if (photo) URL.revokeObjectURL(photo.preview);
                        setPhoto({ file, preview: url });
                    }}
                    onRemove={() => {
                        if (photo) URL.revokeObjectURL(photo.preview);
                        setPhoto(null);
                    }}
                    onError={(msg) => setError(msg)}
                />
                <p className="text-xs text-gray-400 mt-2">Proof of store opening condition</p>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <FormFooter
                label="Open Store"
                loadingLabel="Opening..."
                onSubmit={handleSubmit}
                disabled={!canSubmit}
                isLoading={isSubmitting}
                variant="green"
            />
        </div>
    );
}
