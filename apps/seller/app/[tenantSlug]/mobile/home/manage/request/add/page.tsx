"use client";

import { useState } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { apiFetch } from "@/lib/api/client";
import { SUPPLY_REQUEST_TYPES, SUPPLY_REQUEST_TYPE_LABELS } from "@tea-pos/features/requests/schema";
import type { SupplyRequestType } from "@tea-pos/features/requests/schema";
import { PhotoPicker } from "@/components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

export default function AddRequestPage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useSupplyRequests(selectedStoreId);

    const [selectedType, setSelectedType] = useState<SupplyRequestType | "">("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                const { url: uploadUrl } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = uploadUrl;
            }
            await create({
                type: selectedType as SupplyRequestType,
                notes: notes.trim() || undefined,
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });
            navigation.push(url("/mobile/home/manage/request"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</p>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as SupplyRequestType | "")}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                    >
                        <option value="" disabled>Select type...</option>
                        {SUPPLY_REQUEST_TYPES.map((type) => (
                            <option key={type} value={type}>{SUPPLY_REQUEST_TYPE_LABELS[type]}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any extra details? (optional)"
                        rows={3}
                        maxLength={500}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base resize-none focus:ring-2 focus:ring-brand/90 focus:outline-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</p>
                    <PhotoPicker
                        previewUrl={photoPreview}
                        onCapture={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }}
                        onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        onError={(msg) => setError(msg)}
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <FormFooter
                label="Send Request"
                loadingLabel="Sending..."
                onSubmit={handleSubmit}
                disabled={!selectedType}
                isLoading={isSubmitting}
            />
        </div>
    );
}
