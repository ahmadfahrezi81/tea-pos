"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { compressPhoto } from "@/lib/compressPhoto";
import { apiFetch } from "@/lib/api/client";
import { SUPPLY_REQUEST_TYPES, SUPPLY_REQUEST_TYPE_LABELS } from "@tea-pos/features/requests/schema";
import type { SupplyRequestType } from "@tea-pos/features/requests/schema";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    acknowledged: "Acknowledged",
    fulfilled: "Fulfilled",
};

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    acknowledged: "bg-blue-50 text-blue-700",
    fulfilled: "bg-green-50 text-green-700",
};

export default function RequestPage() {
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { requests, isLoading: loadingRequests, create } = useSupplyRequests(selectedStoreId);

    const [selectedType, setSelectedType] = useState<SupplyRequestType | null>(null);
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressPhoto(file);
            setPhotoFile(compressed);
            setPhotoPreview(URL.createObjectURL(compressed));
        } catch {
            setError("Failed to process photo. Please try again.");
        }
        e.target.value = "";
    };

    const handleSubmit = async () => {
        if (!selectedType || !selectedStoreId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("prefix", "supply-requests");
                const { url } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = url;
            }

            await create({
                type: selectedType,
                notes: notes.trim() || undefined,
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });

            setSelectedType(null);
            setNotes("");
            setPhotoFile(null);
            setPhotoPreview(null);
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send request");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = !!selectedType;

    return (
        <div className="space-y-4 pb-32">
            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">What do you need?</h3>

                {/* Type pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                    {SUPPLY_REQUEST_TYPES.map((type) => (
                        <button
                            key={type}
                            onClick={() => setSelectedType(type)}
                            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                                selectedType === type
                                    ? "bg-brand text-white border-brand"
                                    : "bg-white text-gray-600 border-gray-200"
                            }`}
                        >
                            {SUPPLY_REQUEST_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>

                {/* Notes */}
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any extra details? (optional)"
                    rows={3}
                    maxLength={500}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />

                {/* Photo */}
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handlePhotoChange}
                    />
                    {photoPreview ? (
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photoPreview}
                                alt="Preview"
                                className="w-full h-40 object-cover rounded-lg"
                            />
                            <button
                                onClick={() => {
                                    setPhotoFile(null);
                                    setPhotoPreview(null);
                                }}
                                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-20 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 text-sm active:bg-gray-50"
                        >
                            <Camera size={20} />
                            <span>Add photo (optional)</span>
                        </button>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}
            </div>

            {/* Today's requests */}
            {loadingRequests ? (
                <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : requests.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Today&apos;s Requests</h3>
                    <ul className="space-y-2">
                        {requests.map((r) => (
                            <li key={r.id} className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800">
                                        {SUPPLY_REQUEST_TYPE_LABELS[r.type]}
                                    </p>
                                    {r.notes && (
                                        <p className="text-xs text-gray-500 truncate">{r.notes}</p>
                                    )}
                                </div>
                                <span
                                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}
                                >
                                    {STATUS_LABEL[r.status] ?? r.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Submit button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8">
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className="w-full bg-brand text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Sending...
                        </>
                    ) : submitted ? (
                        <>
                            <CheckCircle2 size={18} />
                            Sent!
                        </>
                    ) : (
                        "Send Request"
                    )}
                </button>
            </div>
        </div>
    );
}
