"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { apiFetch } from "@/lib/api/client";
import {
    INCIDENT_CATEGORIES,
    INCIDENT_CATEGORY_LABELS,
} from "@tea-pos/features/reports/schema";
import type { IncidentCategory } from "@tea-pos/features/reports/schema";
import { SelectInput } from "../../_components/shared/SelectInput";
import { Textarea } from "../../_components/shared/Textarea";
import { PhotoPicker } from "../../_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

const CATEGORY_OPTIONS = INCIDENT_CATEGORIES.map((c) => ({
    value: c,
    label: INCIDENT_CATEGORY_LABELS[c],
}));

export default function AddReportPage() {
    const router = useRouter();
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useIncidentReports(selectedStoreId);

    const [selectedCategory, setSelectedCategory] = useState<
        IncidentCategory | ""
    >("");
    const [customTitle, setCustomTitle] = useState("");
    const [description, setDescription] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedCategory || !description.trim() || !selectedStoreId)
            return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("prefix", "incident-reports");
                const { url: uploadUrl } = await apiFetch<{ url: string }>(
                    "/api/upload",
                    {
                        method: "POST",
                        body: form,
                    },
                );
                photoUrl = uploadUrl;
            }
            const title =
                selectedCategory === "other" && customTitle.trim()
                    ? customTitle.trim()
                    : INCIDENT_CATEGORY_LABELS[selectedCategory];
            await create({
                category: selectedCategory as IncidentCategory,
                title,
                description: description.trim(),
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });
            router.back();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to submit report",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = !!selectedCategory && description.trim().length > 0;

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Category
                    </p>
                    <SelectInput
                        options={CATEGORY_OPTIONS}
                        value={selectedCategory}
                        onChange={(v) => {
                            setSelectedCategory(v as IncidentCategory | "");
                            setCustomTitle("");
                        }}
                        placeholder="Select category..."
                        otherTriggerValue="other"
                        otherValue={customTitle}
                        onOtherChange={setCustomTitle}
                        otherPlaceholder="Describe the incident..."
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Description
                    </p>
                    <Textarea
                        value={description}
                        onChange={setDescription}
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
                        onCapture={(file, url) => {
                            setPhotoFile(file);
                            setPhotoPreview(url);
                        }}
                        onRemove={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                        }}
                        onError={(msg) => setError(msg)}
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <FormFooter
                label="Submit Report"
                loadingLabel="Submitting..."
                onSubmit={handleSubmit}
                disabled={!isValid}
                isLoading={isSubmitting}
            />
        </div>
    );
}
