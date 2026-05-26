"use client";

import { useState, useMemo, useRef } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSummaryPhotos } from "@/lib/hooks/summaries/useSummaryPhotos";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { Camera, X, Loader2 } from "lucide-react";
import { compressPhoto } from "@/lib/compressPhoto";
import { isEnabled } from "@tea-pos/features/shared/features";
import { FormFooter } from "@/components/shared/FormFooter";

export default function OpenStorePage() {
    const { selectedStoreId, selectedStore } = useStore();
    const { url } = useTenantSlug();
    const { gate, openStore, resumeSession } = useSession(selectedStoreId);
    const { uploadPhoto } = useSummaryPhotos();

    const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
    const [openingBalance, setOpeningBalance] = useState(0);
    const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCompressing(true);
        try {
            const compressed = await compressPhoto(file);
            const preview = URL.createObjectURL(compressed);
            if (photo) URL.revokeObjectURL(photo.preview);
            setPhoto({ file: compressed, preview });
        } catch {
            setError("Failed to process photo");
        } finally {
            setIsCompressing(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemovePhoto = () => {
        if (photo) URL.revokeObjectURL(photo.preview);
        setPhoto(null);
    };

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
        !isCompressing &&
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

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {photo ? (
                    <div className="relative">
                        <img
                            src={photo.preview}
                            alt="Opening photo preview"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                            onClick={handleRemovePhoto}
                            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 active:scale-95"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isCompressing}
                        className="w-full h-40 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-50 disabled:opacity-60 transition-colors"
                    >
                        {isCompressing ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <>
                                <Camera size={28} />
                                <span className="text-sm">Take or choose a photo</span>
                            </>
                        )}
                    </button>
                )}

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
