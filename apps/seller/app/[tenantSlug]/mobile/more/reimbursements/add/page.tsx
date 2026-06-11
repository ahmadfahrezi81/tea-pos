"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { usePayrollClaims, useClaimableTypes, useClaimableDates } from "@/lib/hooks/payroll-claims/usePayrollClaims";
import { useCurrentPayrollPeriod } from "@/lib/hooks/payroll/usePayroll";
import { apiFetch } from "@/lib/api/client";
import { SelectInput } from "../../../home/manage/_components/shared/SelectInput";
import { Textarea } from "../../../home/manage/_components/shared/Textarea";
import { PhotoPicker } from "../../../home/manage/_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";
import { format, parseISO } from "date-fns";

function getLocalToday() {
    const offset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const now = new Date();
    const local = new Date(now.getTime() + offset * 60 * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

function getMinDate() {
    const offset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const now = new Date();
    const local = new Date(now.getTime() + offset * 60 * 60 * 1000);
    local.setDate(local.getDate() - 14);
    return local.toISOString().slice(0, 10);
}

export default function AddClaimPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { create } = usePayrollClaims();
    const { period: currentPeriod, isLoading: periodLoading } = useCurrentPayrollPeriod();

    const { types, isLoading: typesLoading } = useClaimableTypes(
        currentPeriod ? { periodId: currentPeriod.id } : null,
    );
    const { dates: claimableDates, isLoading: datesLoading } = useClaimableDates(
        currentPeriod ? { periodId: currentPeriod.id } : null,
    );

    const [selectedTypeId, setSelectedTypeId] = useState("");
    const [date, setDate] = useState(getLocalToday());
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedType = types.find((t) => t.id === selectedTypeId);
    const isWeekly = selectedType?.frequency === "weekly";
    const amount = selectedType?.amount ?? 0;

    // For weekly: if claimable dates loaded after type selection and current date isn't valid,
    // fall back to the most recent claimable date without needing a useEffect
    const effectiveDate = isWeekly && claimableDates.length > 0 && !claimableDates.includes(date)
        ? claimableDates[claimableDates.length - 1]
        : date;

    const typeOptions = types
        .filter((t) => t.claimable)
        .map((t) => ({ value: t.id, label: t.name }));

    const isValid = !!selectedTypeId && amount > 0 && (!isWeekly || claimableDates.includes(effectiveDate));

    const handleSubmit = async () => {
        if (!isValid || !user) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("bucket", "reimbursements");
                form.append("subPath", `${user.id}/${effectiveDate}`);
                const { url: uploadUrl } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = uploadUrl;
            }
            await create({ claimTypeId: selectedTypeId, amount, date: effectiveDate, notes: notes.trim() || undefined, photoUrl });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit claim");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-3 pb-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</p>
                    {periodLoading || typesLoading ? (
                        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                    ) : typeOptions.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">No claimable types available for this period.</p>
                    ) : (
                        <SelectInput
                            options={typeOptions}
                            value={selectedTypeId}
                            onChange={(v) => {
                                setSelectedTypeId(v);
                                const newType = types.find((t) => t.id === v);
                                if (newType?.frequency === "weekly" && claimableDates.length > 0) {
                                    const today = getLocalToday();
                                    setDate(claimableDates.includes(today) ? today : claimableDates[claimableDates.length - 1]);
                                } else {
                                    setDate(getLocalToday());
                                }
                            }}
                            placeholder="Select type..."
                        />
                    )}
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</p>
                    <div className="px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                        <p className={`text-base ${selectedType ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                            {selectedType ? `Rp ${amount.toLocaleString("id-ID")}` : "Select a type first"}
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                    {isWeekly ? (
                        datesLoading ? (
                            <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                        ) : claimableDates.length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">No worked dates found for this period.</p>
                        ) : (
                            <select
                                value={effectiveDate}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-xl text-base bg-white focus:ring-2 focus:ring-brand/90 focus:outline-none"
                            >
                                {claimableDates.map((d) => (
                                    <option key={d} value={d}>
                                        {format(parseISO(d), "EEE, d MMM yyyy")}
                                    </option>
                                ))}
                            </select>
                        )
                    ) : (
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={getMinDate()}
                            max={getLocalToday()}
                            className="w-full p-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                        />
                    )}
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes (optional)</p>
                    <Textarea
                        value={notes}
                        onChange={setNotes}
                        placeholder="Any details..."
                        rows={3}
                        maxLength={500}
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receipt photo (optional)</p>
                    <PhotoPicker
                        previewUrl={photoPreview}
                        onCapture={(file, url) => { setPhotoFile(file); setPhotoPreview(url); }}
                        onRemove={() => { setPhotoFile(null); setPhotoPreview(null); }}
                        onError={(msg) => setError(msg)}
                        allowGallery
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <FormFooter
                label="Submit Claim"
                loadingLabel="Submitting..."
                onSubmit={handleSubmit}
                disabled={!isValid || typeOptions.length === 0}
                isLoading={isSubmitting}
            />
        </div>
    );
}
