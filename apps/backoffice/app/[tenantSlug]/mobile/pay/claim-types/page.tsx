"use client";

import { useState } from "react";
import { usePayrollClaimTypes, useUserClaimEligibility } from "@/lib/hooks/payroll-claim-types/usePayrollClaimTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { apiFetch } from "@/lib/api/client";
import { X, Plus, Users } from "lucide-react";
import type { PayrollClaimTypeResponse } from "@tea-pos/features/payroll-claim-types/schema";

const FREQUENCY_LABEL: Record<string, string> = {
    weekly: "Weekly",
    monthly: "Monthly",
    one_time: "One-time",
};

function EligibilitySheet({
    typeId,
    typeName,
    onClose,
}: {
    typeId: string;
    typeName: string;
    onClose: () => void;
}) {
    const { users } = useTenantUsers();
    const staff = users.filter((u) => u.role !== "ADMIN");

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div
                className="w-full bg-white rounded-t-2xl p-5 pb-8 max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <p className="text-base font-bold text-gray-900">{typeName} — Eligibility</p>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-0.5">
                    {staff.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">No staff found.</p>
                    ) : (
                        staff.map((user) => (
                            <UserEligibilityRow key={user.id} userId={user.id} fullName={user.fullName} targetTypeId={typeId} />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function UserEligibilityRow({
    userId,
    fullName,
    targetTypeId,
}: {
    userId: string;
    fullName: string;
    targetTypeId: string;
}) {
    const { activeTypeIds, mutate, isLoading } = useUserClaimEligibility(userId);
    const isEligible = activeTypeIds.includes(targetTypeId);
    const [toggling, setToggling] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try {
            const newIds = isEligible
                ? activeTypeIds.filter((id) => id !== targetTypeId)
                : [...activeTypeIds, targetTypeId];
            await apiFetch("/api/payroll/claim-types/eligibility", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, claimTypeIds: newIds }),
            });
            await mutate();
        } finally {
            setToggling(false);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-none">
            <p className="text-base text-gray-800">{fullName}</p>
            <button
                onClick={handleToggle}
                disabled={isLoading || toggling}
                className={`relative w-11 h-6 rounded-full transition-colors ${isEligible ? "bg-brand" : "bg-gray-200"} disabled:opacity-40`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEligible ? "translate-x-5" : "translate-x-0"}`}
                />
            </button>
        </div>
    );
}

function CreateSheet({ onClose }: { onClose: () => void }) {
    const { create } = usePayrollClaimTypes();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [frequency, setFrequency] = useState<"weekly" | "monthly" | "one_time">("weekly");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim() || !slug.trim()) { setError("Name and slug are required."); return; }
        setSaving(true); setError(null);
        try {
            await create({ name: name.trim(), slug: slug.trim().toUpperCase().replace(/\s+/g, "_"), frequency });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">New Claim Type</p>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Name</p>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Lunch Allowance"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Slug (auto-formatted)</p>
                    <input
                        type="text"
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. LUNCH_ALLOWANCE"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40 uppercase"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Frequency</p>
                    <div className="flex gap-2">
                        {(["weekly", "monthly", "one_time"] as const).map((f) => (
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

function ClaimTypeRow({ type }: { type: PayrollClaimTypeResponse }) {
    const { update } = usePayrollClaimTypes();
    const [toggling, setToggling] = useState(false);
    const [showEligibility, setShowEligibility] = useState(false);

    const handleToggle = async () => {
        setToggling(true);
        try { await update(type.id, { isEnabled: !type.isEnabled }); }
        finally { setToggling(false); }
    };

    return (
        <>
            <div className="flex items-center gap-3 py-4 border-b border-gray-100 last:border-none">
                <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900">{type.name}</p>
                    <p className="text-sm text-gray-400">{FREQUENCY_LABEL[type.frequency]}</p>
                </div>
                <button
                    onClick={() => setShowEligibility(true)}
                    className="p-2 text-gray-400 active:text-gray-700"
                >
                    <Users size={18} />
                </button>
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
            {showEligibility && (
                <EligibilitySheet typeId={type.id} typeName={type.name} onClose={() => setShowEligibility(false)} />
            )}
        </>
    );
}

export default function ClaimTypesPage() {
    const { claimTypes, isLoading } = usePayrollClaimTypes();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none space-y-1.5">
                            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : claimTypes.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No claim types yet.</p>
                ) : (
                    claimTypes.map((type) => <ClaimTypeRow key={type.id} type={type} />)
                )}
            </div>

            <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white rounded-xl text-brand font-semibold active:opacity-80"
            >
                <Plus size={18} />
                New Claim Type
            </button>

            {showCreate && <CreateSheet onClose={() => setShowCreate(false)} />}
        </div>
    );
}
