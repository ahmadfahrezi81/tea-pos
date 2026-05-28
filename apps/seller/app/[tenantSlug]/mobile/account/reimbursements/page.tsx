"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useReimbursements } from "@/lib/hooks/reimbursements/useReimbursements";
import { compressPhoto } from "@/lib/compressPhoto";
import { Camera, X } from "lucide-react";
import {
    REIMBURSEMENT_TYPE_LABELS,
    REIMBURSEMENT_TYPES_BY_ROLE,
    type ReimbursementType,
} from "@tea-pos/features/reimbursements/schema";

function getLocalToday() {
    const offset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const now = new Date();
    const local = new Date(now.getTime() + offset * 60 * 60 * 1000);
    return local.toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: "bg-gray-100 text-gray-600",
        approved: "bg-blue-100 text-blue-700",
        rejected: "bg-red-100 text-red-600",
        paid: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected",
        paid: "Paid ✓",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
            {labels[status] ?? status}
        </span>
    );
}

export default function ReimbursementsPage() {
    const { user } = useAuth();
    const { claims, isLoading, create } = useReimbursements();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allowedTypes: ReimbursementType[] =
        REIMBURSEMENT_TYPES_BY_ROLE[user?.role ?? "USER"] ?? ["mobile_data", "lunch"];

    const [selectedType, setSelectedType] = useState<ReimbursementType | null>(null);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(getLocalToday());
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const canSubmit = selectedType !== null && amount !== "" && parseInt(amount) > 0 && !submitting;

    async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await compressPhoto(file);
        setPhotoFile(compressed);
        setPhotoPreview(URL.createObjectURL(compressed));
    }

    async function uploadPhoto(file: File, userId: string): Promise<string> {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("prefix", `reimbursements/${userId}`);
        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
        if (!res.ok) throw new Error("Photo upload failed");
        const { url } = await res.json();
        return url as string;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit || !user) return;
        setSubmitting(true);
        setError(null);
        try {
            let photoUrl: string | undefined;
            if (photoFile) {
                photoUrl = await uploadPhoto(photoFile, user.id);
            }
            await create({
                type: selectedType!,
                amount: parseInt(amount),
                date,
                notes: notes.trim() || undefined,
                photoUrl,
            });
            setSuccessMsg("Claim submitted");
            setSelectedType(null);
            setAmount("");
            setDate(getLocalToday());
            setNotes("");
            setPhotoFile(null);
            setPhotoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch {
            setError("Failed to submit claim. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
                {/* Submit form */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <h2 className="text-sm font-semibold text-gray-700 mb-3">Submit a Claim</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Type picker */}
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Type</p>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {allowedTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setSelectedType(type)}
                                        className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                                            selectedType === type
                                                ? "bg-gray-900 text-white border-gray-900"
                                                : "bg-white text-gray-700 border-gray-200"
                                        }`}
                                    >
                                        {REIMBURSEMENT_TYPE_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Amount (Rp)</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 50000"
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">Notes (optional)</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                maxLength={500}
                                placeholder="Any details..."
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                            />
                        </div>

                        {/* Photo */}
                        <div>
                            <p className="text-xs text-gray-500 mb-2">Receipt photo (optional)</p>
                            {photoPreview ? (
                                <div className="relative w-24 h-24">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={photoPreview} alt="Receipt" className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                                    <button
                                        type="button"
                                        onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                        className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-4 py-3"
                                >
                                    <Camera size={18} />
                                    Take photo
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handlePhotoChange}
                                className="hidden"
                            />
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {successMsg && <p className="text-sm text-green-600 font-medium">{successMsg}</p>}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="w-full bg-gray-900 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
                        >
                            {submitting ? "Submitting..." : "Submit Claim"}
                        </button>
                    </form>
                </div>

                {/* Claims list */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h2 className="text-sm font-semibold text-gray-700">My Claims</h2>
                    </div>
                    {isLoading ? (
                        <div className="p-4 space-y-3">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                            ))}
                        </div>
                    ) : claims.length === 0 ? (
                        <p className="p-4 text-sm text-gray-400 text-center">No claims yet.</p>
                    ) : (
                        claims.map((claim, idx) => (
                            <div
                                key={claim.id}
                                className={`flex items-center justify-between px-4 py-3 ${idx < claims.length - 1 ? "border-b border-gray-100" : ""}`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-800">
                                        {REIMBURSEMENT_TYPE_LABELS[claim.type]}
                                    </p>
                                    <p className="text-xs text-gray-400">{claim.date}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                        Rp {claim.amount.toLocaleString("id-ID")}
                                    </p>
                                    <StatusBadge status={claim.status} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
        </div>
    );
}
