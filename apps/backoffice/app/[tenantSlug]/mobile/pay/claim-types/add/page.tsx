"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollClaimTypes } from "@/lib/hooks/payroll-claim-types/usePayrollClaimTypes";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";

const FREQUENCY_LABEL: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    one_time: "One-time",
};

export default function AddClaimTypePage() {
    const router = useRouter();
    const { create } = usePayrollClaimTypes();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "one_time">("weekly");
    const [amount, setAmount] = useState(0);
    const [claimSource, setClaimSource] = useState<"manual" | "auto" | "auto_submit">("manual");
    const [autoThresholdHours, setAutoThresholdHours] = useState(4);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
        setSaving(true);
        setError(null);
        try {
            await create({
                name: name.trim(),
                slug: slug.trim().toUpperCase().replace(/\s+/g, "_"),
                frequency,
                amount,
                claimSource,
                ...((claimSource === "auto" || claimSource === "auto_submit") ? { autoThresholdHours } : {}),
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <TextInput value={name} onChange={setName} placeholder="e.g. Lunch Allowance" className="text-base font-medium" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Slug (auto-formatted)</p>
                    <TextInput
                        value={slug}
                        onChange={(v) => setSlug(v.toUpperCase().replace(/\s+/g, "_"))}
                        placeholder="e.g. LUNCH_ALLOWANCE"
                        className="text-base font-medium"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Amount</p>
                    <NumberInput value={amount} onChange={setAmount} currency prefix="Rp" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Frequency</p>
                    <div className="flex gap-2">
                        {(["daily", "weekly", "monthly", "one_time"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFrequency(f)}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${frequency === f ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"}`}
                            >
                                {FREQUENCY_LABEL[f]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Decided by</p>
                    <div className="flex gap-2">
                        {(["manual", "auto_submit", "auto"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setClaimSource(s)}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${claimSource === s ? "bg-brand text-white border-brand" : "border-gray-200 text-gray-600"}`}
                            >
                                {s === "manual" ? "Staff submits" : s === "auto_submit" ? "Auto submit" : "Auto (hours)"}
                            </button>
                        ))}
                    </div>
                </div>
                {(claimSource === "auto" || claimSource === "auto_submit") && (
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-700">
                            Minimum hours worked{claimSource === "auto_submit" ? " (optional)" : ""}
                        </p>
                        <NumberInput value={autoThresholdHours} onChange={setAutoThresholdHours} unit="hours" />
                    </div>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <FormFooter
                label="Create Claim Type"
                loadingLabel="Creating..."
                onSubmit={handleSave}
                disabled={!name || !slug}
                isLoading={saving}
            />
        </div>
    );
}
