"use client";

import { useCurrentUser } from "@/lib/hooks/user/useCurrentUser";
import { useAuth } from "@/lib/context/AuthContext";
import { usersApi } from "@/lib/api/users";
import { Copy, Check, Pencil, X } from "lucide-react";
import { useState } from "react";

// ============================================================================
// FIELD ROW
// ============================================================================

const FieldRow = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };

    return (
        <div className="py-4 border-b border-gray-100 last:border-none">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-center justify-between gap-3">
                <p className="text-base text-gray-900 font-medium">{value}</p>
                {copyable && (
                    <button onClick={handleCopy} className="shrink-0 text-gray-400 active:scale-95 transition-transform">
                        {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
};

const SkeletonRow = () => (
    <div className="py-4 border-b border-gray-100 last:border-none space-y-2">
        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
    </div>
);

// ============================================================================
// BANK ACCOUNT SECTION
// ============================================================================

function BankAccountSection({ user, onSaved }: { user: NonNullable<ReturnType<typeof useCurrentUser>["user"]>; onSaved: () => void }) {
    const [editing, setEditing] = useState(false);
    const [bankName, setBankName] = useState(user.bankName ?? "");
    const [accountNumber, setAccountNumber] = useState(user.bankAccountNumber ?? "");
    const [accountHolder, setAccountHolder] = useState(user.bankAccountHolder ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { mutate } = useAuth();

    const hasBankInfo = user.bankName || user.bankAccountNumber;

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await usersApi.update({
                bankName: bankName || null,
                bankAccountNumber: accountNumber || null,
                bankAccountHolder: accountHolder || null,
            });
            await mutate();
            onSaved();
            setEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setBankName(user.bankName ?? "");
        setAccountNumber(user.bankAccountNumber ?? "");
        setAccountHolder(user.bankAccountHolder ?? "");
        setEditing(false);
    };

    return (
        <div className="bg-white rounded-xl px-4 shadow-sm">
            <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Bank Account</p>
                {!editing && (
                    <button onClick={() => setEditing(true)} className="text-brand active:opacity-70">
                        <Pencil size={16} />
                    </button>
                )}
                {editing && (
                    <button onClick={handleCancel} className="text-gray-400 active:opacity-70">
                        <X size={16} />
                    </button>
                )}
            </div>

            {!editing ? (
                hasBankInfo ? (
                    <>
                        {user.bankName && <FieldRow label="Bank" value={user.bankName} />}
                        {user.bankAccountNumber && <FieldRow label="Account Number" value={user.bankAccountNumber} copyable />}
                        {user.bankAccountHolder && <FieldRow label="Account Holder" value={user.bankAccountHolder} />}
                    </>
                ) : (
                    <p className="py-4 text-sm text-gray-400">No bank account set. Tap edit to add one.</p>
                )
            ) : (
                <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Bank Name</p>
                        <input
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g. BCA, BRI, Mandiri"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Account Number</p>
                        <input
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            inputMode="numeric"
                            placeholder="e.g. 1234567890"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500">Account Holder</p>
                        <input
                            value={accountHolder}
                            onChange={(e) => setAccountHolder(e.target.value)}
                            placeholder="Name on account"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-3 bg-brand text-white font-semibold rounded-xl active:opacity-80 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function formatUserId(id: string) { return id.slice(0, 13).toUpperCase(); }
function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function splitFullName(fullName: string) {
    const parts = fullName?.trim().split(" ") ?? [];
    return { firstName: parts[0] ?? "—", lastName: parts.slice(1).join(" ") || "—" };
}

export default function MobilePersonalDetails() {
    const { user, isLoading, isError, mutate } = useCurrentUser();

    if (isError) {
        return <div className="bg-white rounded-2xl p-6 text-center text-sm text-gray-600">Failed to load profile details.</div>;
    }

    const { firstName, lastName } = user ? splitFullName(user.fullName) : { firstName: "—", lastName: "—" };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl px-4 shadow-sm">
                {isLoading ? (
                    <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
                ) : (
                    <>
                        <FieldRow label="Email" value={user?.email ?? "—"} />
                        <FieldRow label="User ID" value={formatUserId(user?.id ?? "")} copyable />
                        <FieldRow label="First Name" value={firstName} />
                        <FieldRow label="Last Name" value={lastName} />
                        <FieldRow label="Phone Number" value={user?.phoneNumber ?? "—"} />
                        <FieldRow label="Member Since" value={formatDate(user?.createdAt ?? null)} />
                    </>
                )}
            </div>

            {!isLoading && user && (
                <BankAccountSection user={user} onSaved={() => mutate()} />
            )}
        </div>
    );
}
