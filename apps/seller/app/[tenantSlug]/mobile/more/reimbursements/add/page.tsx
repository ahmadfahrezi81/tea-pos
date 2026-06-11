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
    const { dates: claimableDates } = useClaimableDates(
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

    const typeOptions = types
        .filter((t) => t.claimable)
        .map((t) => ({ value: t.id, label: t.name }));

    const isValid = !!selectedTypeId && amount > 0 && (!isWeekly || claimableDates.includes(date));

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
                form.append("subPath", `${user.id}/${date}`);
                const { url: uploadUrl } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = uploadUrl;
            }
            await create({ claimTypeId: selectedTypeId, amount, date, notes: notes.trim() || undefined, photoUrl });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to submit claim");
        } finally {
            setIsSubmitting(false);
        }
    };

    const dateInputProps = isWeekly && claimableDates.length > 0
        ? { min: claimableDates[0], max: claimableDates[claimableDates.length - 1] }
        : { min: getMinDate(), max: getLocalToday() };

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
                            onChange={(v) => { setSelectedTypeId(v); setDate(getLocalToday()); }}
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
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        {...dateInputProps}
                        className="w-full p-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                    />
                    {isWeekly && claimableDates.length > 0 && !claimableDates.includes(date) && (
                        <p className="text-xs text-amber-600">No session found for this date. Select a date you worked.</p>
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
