"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { getTodayLocalStr } from "@tea-pos/utils/time";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { apiFetch } from "@/lib/api/client";
import {
    INCIDENT_CATEGORIES,
    INCIDENT_CATEGORY_LABELS,
} from "@tea-pos/features/reports/schema";
import { SelectInput } from "../../_components/shared/SelectInput";
import { Textarea } from "../../_components/shared/Textarea";
import { PhotoPicker } from "../../_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

const TYPE_OPTIONS = INCIDENT_CATEGORIES.map((c) => ({
    value: c,
    label: c === "other" ? "Custom" : INCIDENT_CATEGORY_LABELS[c],
}));

export default function AddReportPage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useIncidentReports(selectedStoreId);

    const todayStr = useMemo(() => getTodayLocalStr(), []);

    const [selectedType, setSelectedType] = useState("");
    const [customType, setCustomType] = useState("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resolvedType = selectedType === "other" ? customType.trim() : selectedType;
    const isValid = !!resolvedType && notes.trim().length > 0;

    const handleSubmit = async () => {
        if (!isValid || !selectedStoreId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("bucket", "store-reports");
                form.append("subPath", `${selectedStoreId}/${todayStr}`);
                const { url: uploadUrl } = await apiFetch<{ url: string }>(
                    "/api/upload",
                    { method: "POST", body: form },
                );
                photoUrl = uploadUrl;
            }
            await create({
                type: resolvedType,
                notes: notes.trim(),
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Type
                    </p>
                    <SelectInput
                        options={TYPE_OPTIONS}
                        value={selectedType}
                        onChange={(v) => { setSelectedType(v); setCustomType(""); }}
                        placeholder="Select type..."
                        otherTriggerValue="other"
                        otherValue={customType}
                        onOtherChange={setCustomType}
                        otherPlaceholder="Describe the incident type..."
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Notes
                    </p>
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        placeholder="Describe what happened"
                        rows={4}
                        maxLength={1000}
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Photo
                    </p>
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
                label="Submit Store Report"
                loadingLabel="Submitting..."
                onSubmit={handleSubmit}
                disabled={!isValid}
                isLoading={isSubmitting}
            />
        </div>
    );
}
