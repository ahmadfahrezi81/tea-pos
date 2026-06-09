"use client";

import { useState } from "react";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { X, Plus } from "lucide-react";
import type { PayrollCommissionTypeResponse } from "@tea-pos/features/payroll-commission-types/schema";

function CreateSheet({ onClose }: { onClose: () => void }) {
    const { create } = usePayrollCommissionTypes();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
        setSaving(true); setError(null);
        try {
            await create({ name: name.trim(), slug: slug.trim().toUpperCase().replace(/\s+/g, "_") });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">New Commission Type</p>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Name</p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Seller Standard"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Slug (auto-formatted)</p>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. SELLER_STANDARD"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40 uppercase"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    onClick={handleSave}
                    disabled={saving || !name || !slug}
                    className="w-full py-3.5 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                >
                    {saving ? "Creating..." : "Create"}
                </button>
            </div>
        </div>
    );
}

function CommissionTypeRow({ type }: { type: PayrollCommissionTypeResponse }) {
    const { update } = usePayrollCommissionTypes();
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try { await update(type.id, { isEnabled: !type.isEnabled }); }
        finally { setToggling(false); }
    };

    return (
        <div className="flex items-center gap-3 py-4 border-b border-gray-100 last:border-none">
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900">{type.name}</p>
                <p className="text-xs text-gray-400 font-mono">{type.slug}</p>
            </div>
            <button
                onClick={handleToggle}
                disabled={toggling}
                className={`relative w-11 h-6 rounded-full transition-colors ${type.isEnabled ? "bg-brand" : "bg-gray-200"} disabled:opacity-40`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${type.isEnabled ? "translate-x-5" : "translate-x-0"}`}
                />
            </button>
        </div>
    );
}

export default function CommissionTypesPage() {
    const { commissionTypes, isLoading } = usePayrollCommissionTypes();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none space-y-1.5">
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : commissionTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No commission types yet.</p>
                ) : (
                    commissionTypes.map((type) => <CommissionTypeRow key={type.id} type={type} />)
                )}
            </div>

            <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white rounded-xl text-brand font-semibold active:opacity-80"
            >
                <Plus size={18} />
                New Commission Type
            </button>

            {showCreate && <CreateSheet onClose={() => setShowCreate(false)} />}
        </div>
    );
}
