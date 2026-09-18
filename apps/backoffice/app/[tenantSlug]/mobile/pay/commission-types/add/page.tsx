"use client";

import { useState } from "react";
import { navigation } from "@tea-pos/utils/navigation";
import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";
import { Field } from "@tea-pos/ui/custom/Field";

export default function AddCommissionTypePage() {
    const { create } = usePayrollCommissionConfigs();
    const { showError } = useErrorSheet();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [ratePerCup, setRatePerCup] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        // False releases the button: nothing was sent.
        if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return false; }
        setError(null);
        await create({
            name: name.trim(),
            slug: slug.trim().toUpperCase().replace(/\s+/g, "_"),
            ratePerCup,
        });
        navigation.back();
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <Field label="Name" required>
                    <TextInput value={name} onChange={setName} placeholder="e.g. Seller Standard" className="text-base font-medium" />
                </Field>
                <Field label="Slug (auto-formatted)" required>
                    <TextInput
                        value={slug}
                        onChange={(v) => setSlug(v.toUpperCase().replace(/\s+/g, "_"))}
                        placeholder="e.g. SELLER_STANDARD"
                        className="text-base font-medium"
                    />
                </Field>
                <Field label="Rate per cup">
                    <NumberInput value={ratePerCup || null} onChange={(v) => setRatePerCup(v ?? 0)} currency prefix="Rp" />
                </Field>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <FormFooter
                label="Create Commission Type"
                loadingLabel="Creating..."
                onSubmit={handleSave}
                onError={showError}
                disabled={!name || !slug}
                confirmTitle="Create commission type?"
                confirmMessage="Staff can be assigned to it afterward from the staff pay page."
            />
        </div>
    );
}
