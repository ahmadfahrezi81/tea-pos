"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";

export default function AddCommissionTypePage() {
    const router = useRouter();
    const { create } = usePayrollCommissionTypes();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [ratePerCup, setRatePerCup] = useState(0);
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
                ratePerCup,
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
                    <TextInput value={name} onChange={setName} placeholder="e.g. Seller Standard" className="text-base font-medium" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Slug (auto-formatted)</p>
                    <TextInput
                        value={slug}
                        onChange={(v) => setSlug(v.toUpperCase().replace(/\s+/g, "_"))}
                        placeholder="e.g. SELLER_STANDARD"
                        className="text-base font-medium"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Rate per cup</p>
                    <NumberInput value={ratePerCup} onChange={setRatePerCup} currency prefix="Rp" />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <FormFooter
                label="Create Commission Type"
                loadingLabel="Creating..."
                onSubmit={handleSave}
                disabled={!name || !slug}
                isLoading={saving}
            />
        </div>
    );
}
