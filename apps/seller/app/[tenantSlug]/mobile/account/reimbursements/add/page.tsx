"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { useReimbursements } from "@/lib/hooks/reimbursements/useReimbursements";
import { apiFetch } from "@/lib/api/client";
import {
    REIMBURSEMENT_TYPE_LABELS,
    REIMBURSEMENT_TYPES_BY_ROLE,
    type ReimbursementType,
} from "@tea-pos/features/reimbursements/schema";
import { SelectInput } from "../../../home/manage/_components/shared/SelectInput";
import { NumberInput } from "../../../home/manage/_components/shared/NumberInput";
import { Textarea } from "../../../home/manage/_components/shared/Textarea";
import { PhotoPicker } from "../../../home/manage/_components/shared/PhotoPicker";
import { FormFooter } from "@/components/shared/FormFooter";

function getLocalToday() {
    const offset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const now = new Date();
    const local = new Date(now.getTime() + offset * 60 * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

export default function AddReimbursementPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { create } = useReimbursements();

    const allowedTypes: ReimbursementType[] =
        REIMBURSEMENT_TYPES_BY_ROLE[user?.role ?? "USER"] ?? ["mobile_data", "lunch"];

    const TYPE_OPTIONS = allowedTypes.map((t) => ({
        value: t,
        label: REIMBURSEMENT_TYPE_LABELS[t],
    }));

    const [selectedType, setSelectedType] = useState("");
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(getLocalToday());
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValid = !!selectedType && amount > 0;

    const handleSubmit = async () => {
        if (!isValid || !user) return;
        setIsSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                const form = new FormData();
                form.append("file", photoFile);
                form.append("prefix", `reimbursements/${user.id}`);
                const { url: uploadUrl } = await apiFetch<{ url: string }>("/api/upload", {
                    method: "POST",
                    body: form,
                });
                photoUrl = uploadUrl;
            }
            await create({
                type: selectedType as ReimbursementType,
                amount,
                date,
                notes: notes.trim() || undefined,
                photoUrl,
            });
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
                    <SelectInput
                        options={TYPE_OPTIONS}
                        value={selectedType}
                        onChange={setSelectedType}
                        placeholder="Select type..."
                    />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</p>
                    <NumberInput value={amount} onChange={setAmount} />
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white"
                    />
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
                disabled={!isValid}
                isLoading={isSubmitting}
            />
        </div>
    );
}
