"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useSupplyRequests } from "@/lib/hooks/requests/useSupplyRequests";
import { apiFetch } from "@/lib/api/client";
import { SUPPLY_REQUEST_TYPES, SUPPLY_REQUEST_TYPE_LABELS } from "@tea-pos/features/requests/schema";
import type { SupplyRequestType } from "@tea-pos/features/requests/schema";
import { SelectInput } from "../../_components/shared/SelectInput";
import { Textarea } from "../../_components/shared/Textarea";
import { PhotoPicker } from "../../_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

const TYPE_OPTIONS = SUPPLY_REQUEST_TYPES.map((t) => ({
    value: t,
    label: SUPPLY_REQUEST_TYPE_LABELS[t],
}));

export default function AddRequestPage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useSupplyRequests(selectedStoreId);

    const [selectedType, setSelectedType] = useState<SupplyRequestType | "">("");
    const [customTypeText, setCustomTypeText] = useState("");
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
            router.back();
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
                    <SelectInput
                        options={TYPE_OPTIONS}
                        value={selectedType}
                        onChange={(v) => { setSelectedType(v as SupplyRequestType | ""); setNotes(""); }}
                        placeholder="Select type..."
                        otherTriggerValue="other"
                        otherValue={customTypeText}
                        onOtherChange={setCustomTypeText}
                        otherPlaceholder="e.g. Napkins, Straws..."
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        placeholder="Any extra details? (optional)"
                        rows={3}
                        maxLength={500}
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
