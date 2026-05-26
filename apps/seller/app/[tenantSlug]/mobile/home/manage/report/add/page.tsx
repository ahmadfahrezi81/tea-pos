"use client";

import { useState } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { apiFetch } from "@/lib/api/client";
import { INCIDENT_CATEGORIES, INCIDENT_CATEGORY_LABELS } from "@tea-pos/features/reports/schema";
import type { IncidentCategory } from "@tea-pos/features/reports/schema";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { FormFooter } from "@/components/shared/FormFooter";

export default function AddReportPage() {
    const { selectedStoreId } = useStore();
    const { url } = useTenantSlug();
    const { summaryId } = useSession(selectedStoreId);
    const { create } = useIncidentReports(selectedStoreId);

    const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | "">("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedCategory || !title.trim() || !description.trim() || !selectedStoreId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("prefix", "incident-reports");
                const { url: uploadUrl } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = uploadUrl;
            }
            await create({
                category: selectedCategory as IncidentCategory,
                title: title.trim(),
                description: description.trim(),
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });
            navigation.push(url("/mobile/home/manage/report"));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = !!selectedCategory && title.trim().length > 0 && description.trim().length > 0;

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</p>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as IncidentCategory | "")}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                    >
                        <option value="" disabled>Select category...</option>
                        {INCIDENT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{INCIDENT_CATEGORY_LABELS[cat]}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</p>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief title"
                        maxLength={100}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-brand/90 focus:outline-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</p>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what happened"
                        rows={4}
                        maxLength={1000}
                        className="w-full p-3 border border-gray-200 rounded-lg text-base resize-none focus:ring-2 focus:ring-brand/90 focus:outline-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Photo</p>
                    <ImagePicker
                        previewUrl={photoPreview}
                        onCapture={(file, previewUrl) => { setPhotoFile(file); setPhotoPreview(previewUrl); }}
                        onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
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
                variant="orange"
            />
        </div>
    );
}
