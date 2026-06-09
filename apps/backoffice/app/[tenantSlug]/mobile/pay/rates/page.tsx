"use client";

import { useState } from "react";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { apiFetch, buildParams } from "@/lib/api/client";
import { ChevronRight, X } from "lucide-react";
import type { User } from "@tea-pos/features/users/schema";

function UserRateRow({ user, onEdit }: { user: User; onEdit: (user: User) => void }) {
    const { info, isLoading } = usePayrollUserInfo(user.id);
    return (
        <button onClick={() => onEdit(user)} className="w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none active:bg-gray-50 text-left">
            <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-gray-900">{user.fullName}</p>
                {isLoading ? (
                    <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse mt-1" />
                ) : !info?.ratePerCup ? (
                    <p className="text-sm text-amber-600">No rate set</p>
                ) : (
                    <p className="text-sm text-gray-500">
                        Rp {info.ratePerCup.toLocaleString("id-ID")} / cup
                    </p>
                )}
            </div>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
        </button>
    );
}

function EditRateSheet({
    user,
    onClose,
    onSaved,
}: {
    user: User;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { info } = usePayrollUserInfo(user.id);
    const [rate, setRate] = useState(info?.ratePerCup?.toString() ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        const rateNum = parseInt(rate, 10);
        if (isNaN(rateNum) || rateNum < 0) { setError("Enter a valid rate."); return; }
        setSaving(true); setError(null);
        try {
            const sp = buildParams({ userId: user.id } as Record<string, unknown>);
            await apiFetch(`/api/payroll-user-info?${sp}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ratePerCup: rateNum }),
            });
            onSaved(); onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
            <div className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">Set Rate — {user.fullName}</p>
                    <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Rate per cup (Rp)</p>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                    onClick={handleSave}
                    disabled={saving || !rate}
                    className="w-full py-3.5 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                >
                    {saving ? "Saving..." : "Save Rate"}
                </button>
            </div>
        </div>
    );
}

export default function CommissionRatesPage() {
    const { users, isLoading, mutate } = useTenantUsers();
    const [editUser, setEditUser] = useState<User | null>(null);
    const staff = users.filter((u) => u.role !== "ADMIN");

    return (
        <div className="space-y-3">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="py-4 border-b border-gray-100 last:border-none space-y-1.5">
                            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3.5 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                    ))
                ) : staff.length === 0 ? (
                    <p className="py-4 text-sm text-gray-400">No staff found.</p>
                ) : (
                    staff.map((user) => <UserRateRow key={user.id} user={user} onEdit={setEditUser} />)
                )}
            </div>
            {editUser && (
                <EditRateSheet user={editUser} onClose={() => setEditUser(null)} onSaved={() => mutate()} />
            )}
        </div>
    );
}
