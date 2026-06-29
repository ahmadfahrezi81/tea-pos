"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayrollClaimTypes, useUserClaimEligibility } from "@/lib/hooks/payroll-claim-types/usePayrollClaimTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { apiFetch } from "@/lib/api/client";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { Copy, Check, Search, X } from "lucide-react";
import { useToast } from "@/lib/context/ToastContext";

function EligibilityToggle({
    userId,
    typeId,
    localOverride,
    onToggle,
}: {
    userId: string;
    typeId: string;
    localOverride: boolean | undefined;
    onToggle: (userId: string, newIds: string[]) => void;
}) {
    const { activeTypeIds, isLoading } = useUserClaimEligibility(userId);
    const isEligible = localOverride !== undefined ? localOverride : activeTypeIds.includes(typeId);

    const handleToggle = () => {
        const newIds = isEligible
            ? activeTypeIds.filter((id) => id !== typeId)
            : [...activeTypeIds, typeId];
        onToggle(userId, newIds);
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            className={`relative w-11 h-6 rounded-full transition-colors ${isEligible ? "bg-brand" : "bg-gray-200"} disabled:opacity-40`}
        >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isEligible ? "translate-x-5" : "translate-x-0"}`} />
        </button>
    );
}

export default function EditClaimTypePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { claimTypes, isLoading, update } = usePayrollClaimTypes();
    const { users } = useTenantUsers();
    const type = claimTypes.find((t) => t.id === id);

    const [name, setName] = useState("");
    const [isEnabled, setIsEnabled] = useState(true);
    const [search, setSearch] = useState("");
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [pendingEligibility, setPendingEligibility] = useState<Record<string, string[]>>({});
    const [eligibilityOverrides, setEligibilityOverrides] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (type) {
            setName(type.name);
            setIsEnabled(type.isEnabled);
        }
    }, [type?.id]);

    const staff = users.filter((u) => u.role !== "ADMIN");
    const filteredStaff = search.trim()
        ? staff.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()))
        : staff;

    const handleEligibilityToggle = (userId: string, newIds: string[]) => {
        const isNowEligible = newIds.includes(id);
        setPendingEligibility((prev) => ({ ...prev, [userId]: newIds }));
        setEligibilityOverrides((prev) => ({ ...prev, [userId]: isNowEligible }));
    };

    const handleSave = async () => {
        if (!name.trim()) { setError("Name is required."); return; }
        setSaving(true);
        setError(null);
        try {
            await update(id, { name: name.trim(), isEnabled });
            await Promise.all(
                Object.entries(pendingEligibility).map(([userId, claimConfigIds]) =>
                    apiFetch("/api/payroll/claim-types/eligibility", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId, claimConfigIds }),
                    })
                )
            );
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

    if (!type) return <p className="p-4 text-sm text-gray-400">Claim type not found.</p>;

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
                    <TextInput value={name} onChange={setName} placeholder="e.g. Lunch Allowance" className="text-base font-medium" />
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
                    <p className="text-sm font-medium text-gray-700">Amount</p>
                    <div className="px-3 py-2.5 border border-gray-100 rounded-2xl bg-gray-50">
                        <p className="text-base text-gray-500">Rp {(type.amount ?? 0).toLocaleString("id-ID")}</p>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <p className="text-sm font-medium text-gray-700">Decided by</p>
                    <div className="px-3 py-2.5 border border-gray-100 rounded-2xl bg-gray-50">
                        <p className="text-base text-gray-500">
                            {type.claimSource === "auto"
                                ? `Auto — needs ${type.autoThresholdHours ?? "?"}h worked`
                                : type.claimSource === "auto_submit"
                                ? "Auto submit — admin reviews"
                                : "Staff submits"}
                        </p>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="flex-1 text-base text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                />
                {search && (
                    <button onClick={() => setSearch("")} className="text-gray-400 active:text-gray-600 shrink-0">
                        <X size={16} />
                    </button>
                )}
            </div>

            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Eligibility</p>
                {filteredStaff.length === 0 ? (
                    <p className="text-sm text-gray-400 px-1">No staff found.</p>
                ) : (
                    filteredStaff.map((u) => (
                        <div key={u.id} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between">
                            <p className="text-base font-medium text-gray-900">{u.fullName}</p>
                            <EligibilityToggle
                                userId={u.id}
                                typeId={id}
                                localOverride={eligibilityOverrides[u.id]}
                                onToggle={handleEligibilityToggle}
                            />
                        </div>
                    ))
                )}
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
