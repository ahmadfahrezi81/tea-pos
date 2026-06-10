"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { NumberInput } from "@tea-pos/ui/custom/NumberInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/lib/context/ToastContext";

export default function EditCommissionTypePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { commissionTypes, isLoading, update } = usePayrollCommissionTypes();
    const type = commissionTypes.find((t) => t.id === id);
    const { showToast } = useToast();

    const [name, setName] = useState("");
    const [isEnabled, setIsEnabled] = useState(true);
    const [ratePerCup, setRatePerCup] = useState(0);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (type) {
            setName(type.name);
            setIsEnabled(type.isEnabled);
            setRatePerCup(type.ratePerCup);
        }
    }, [type?.id]);

    const handleSave = async () => {
        if (!name.trim()) { setError("Name is required."); return; }
        setSaving(true);
        setError(null);
        try {
            await update(id, { name: name.trim(), isEnabled, ratePerCup });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!type) return <p className="p-4 text-sm text-gray-400">Commission type not found.</p>;

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Enabled</p>
                    <button
                        onClick={() => setIsEnabled(!isEnabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${isEnabled ? "bg-brand" : "bg-gray-200"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Name</p>
                    <TextInput value={name} onChange={setName} placeholder="e.g. Seller Standard" className="text-base font-medium" />
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Slug</p>
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-100 rounded-2xl bg-gray-50">
                        <p className="flex-1 font-mono text-base text-gray-500">{type.slug}</p>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(type.slug)
                                    .then(() => {
                                        setCopied(true);
                                        showToast("Slug copied to clipboard!", "success");
                                        setTimeout(() => setCopied(false), 3000);
                                    })
                                    .catch(() => showToast("Failed to copy slug", "error"));
                            }}
                            disabled={copied}
                            className={`p-1 transition-transform active:scale-90 ${copied ? "text-green-500 opacity-50" : "text-gray-400"}`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Rate per cup</p>
                    <NumberInput value={ratePerCup} onChange={setRatePerCup} currency prefix="Rp" />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <FormFooter
                label="Save Changes"
                loadingLabel="Saving..."
                onSubmit={handleSave}
                disabled={!name}
                isLoading={saving}
            />
        </div>
    );
}
