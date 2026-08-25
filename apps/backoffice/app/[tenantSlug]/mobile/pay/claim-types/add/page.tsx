"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollClaimConfigs } from "@/lib/hooks/payroll-claim-configs/usePayrollClaimConfigs";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";
import { Field } from "@tea-pos/ui/custom/Field";

const FREQUENCY_LABEL: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    one_time: "One-time",
};

export default function AddClaimTypePage() {
    const router = useRouter();
    const { create } = usePayrollClaimConfigs();
    const { showError } = useErrorSheet();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "one_time">("weekly");
    const [amount, setAmount] = useState(0);
    const [claimSource, setClaimSource] = useState<"manual" | "auto" | "auto_submit">("manual");
    const [autoThresholdHours, setAutoThresholdHours] = useState(4);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const needsThreshold = claimSource === "auto";
    const isValid = !!name.trim() && !!slug.trim() && (!needsThreshold || autoThresholdHours > 0);

    const handleSave = async () => {
        if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
        if (needsThreshold && autoThresholdHours <= 0) {
            setError("Auto claims need a minimum hours threshold.");
            return;
        }
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
            showError(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <Field label="Name" required>
                    <TextInput value={name} onChange={setName} placeholder="e.g. Lunch Allowance" className="text-base font-medium" />
                </Field>
                <Field label="Slug (auto-formatted)" required>
                    <TextInput
                        value={slug}
                        onChange={(v) => setSlug(v.toUpperCase().replace(/\s+/g, "_"))}
                        placeholder="e.g. LUNCH_ALLOWANCE"
                        className="text-base font-medium"
                    />
                </Field>
                <Field label="Amount">
                    <NumberInput value={amount || null} onChange={(v) => setAmount(v ?? 0)} currency prefix="Rp" />
                </Field>
                <Field label="Frequency">
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
                </Field>
                <Field label="Decided by">
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
                </Field>
                {(claimSource === "auto" || claimSource === "auto_submit") && (
                    <Field label="Minimum hours worked" required={needsThreshold}>
                        <NumberInput value={autoThresholdHours || null} onChange={(v) => setAutoThresholdHours(v ?? 0)} unit="hours" />
                    </Field>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <FormFooter
                label="Create Claim Type"
                loadingLabel="Creating..."
                onSubmit={handleSave}
                disabled={!isValid}
                isLoading={saving}
                confirmTitle="Create claim type?"
                confirmMessage="Staff will need to be marked eligible before they can submit against it."
            />
        </div>
    );
}
