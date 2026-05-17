"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/context/StoreContext";
import { useSession } from "@/lib/hooks/sessions/useSession";
import { useIncidentReports } from "@/lib/hooks/reports/useIncidentReports";
import { compressPhoto } from "@/lib/compressPhoto";
import { apiFetch } from "@/lib/api/client";
import { INCIDENT_CATEGORIES, INCIDENT_CATEGORY_LABELS } from "@tea-pos/features/reports/schema";
import type { IncidentCategory } from "@tea-pos/features/reports/schema";
import { Wrench, ShieldAlert, Sparkles, MoreHorizontal, Camera, Loader2, CheckCircle2 } from "lucide-react";

const CATEGORY_ICON: Record<IncidentCategory, React.ReactNode> = {
    equipment: <Wrench size={20} />,
    safety: <ShieldAlert size={20} />,
    hygiene: <Sparkles size={20} />,
    other: <MoreHorizontal size={20} />,
};

const STATUS_LABEL: Record<string, string> = {
    open: "Open",
    acknowledged: "Acknowledged",
    resolved: "Resolved",
};

const STATUS_STYLE: Record<string, string> = {
    open: "bg-red-50 text-red-700",
    acknowledged: "bg-yellow-50 text-yellow-700",
    resolved: "bg-green-50 text-green-700",
};

export default function ReportPage() {
    const { selectedStoreId } = useStore();
    const { summaryId } = useSession(selectedStoreId);
    const { reports, isLoading: loadingReports, create } = useIncidentReports(selectedStoreId);

    const [selectedCategory, setSelectedCategory] = useState<IncidentCategory | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
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
        if (!selectedCategory || !title.trim() || !description.trim() || !selectedStoreId) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("prefix", "incident-reports");
                const { url } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = url;
            }

            await create({
                category: selectedCategory,
                title: title.trim(),
                description: description.trim(),
                photoUrl,
                dailySummaryId: summaryId ?? undefined,
            });

            setSelectedCategory(null);
            setTitle("");
            setDescription("");
            setPhotoFile(null);
            setPhotoPreview(null);
            setSubmitted(true);
            setTimeout(() => setSubmitted(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit report");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isValid = !!selectedCategory && title.trim().length > 0 && description.trim().length > 0;

    return (
        <div className="space-y-4 pb-32">
            {/* Form */}
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">What happened?</h3>

                {/* Category 2×2 grid */}
                <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${
                                selectedCategory === cat
                                    ? "bg-brand/10 border-brand text-brand"
                                    : "bg-white border-gray-200 text-gray-600"
                            }`}
                        >
                            <span className="shrink-0">{CATEGORY_ICON[cat]}</span>
                            <span className="text-sm font-medium">{INCIDENT_CATEGORY_LABELS[cat]}</span>
                        </button>
                    ))}
                </div>

                {/* Title */}
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title *"
                    maxLength={100}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />

                {/* Description */}
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what happened *"
                    rows={4}
                    maxLength={1000}
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

            {/* Today's reports */}
            {loadingReports ? (
                <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : reports.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700">Today&apos;s Reports</h3>
                    <ul className="space-y-3">
                        {reports.map((r) => (
                            <li key={r.id} className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {INCIDENT_CATEGORY_LABELS[r.category]}
                                    </p>
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

            {/* Submit */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-8">
                <button
                    onClick={handleSubmit}
                    disabled={!isValid || isSubmitting}
                    className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Submitting...
                        </>
                    ) : submitted ? (
                        <>
                            <CheckCircle2 size={18} />
                            Submitted!
                        </>
                    ) : (
                        "Submit Report"
                    )}
                </button>
            </div>
        </div>
    );
}
