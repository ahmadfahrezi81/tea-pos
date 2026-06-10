"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { TextInput } from "@tea-pos/ui/custom/TextInput";
import { FormFooter } from "@/components/shared/FormFooter";
import { Check, UserCircle } from "lucide-react";

function InitialsAvatar({ name }: { name: string }) {
    const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
            {initials ? (
                <span className="text-xl font-bold text-brand">{initials}</span>
            ) : (
                <UserCircle size={40} className="text-brand" />
            )}
        </div>
    );
}

const ROLE_LABEL: Record<string, string> = {
    ADMIN: "Admin",
    USER: "Staff",
    DRIVER: "Driver",
    SUPPLIER: "Supplier",
};

export default function StaffPayrollInfoPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { users } = useTenantUsers();
    const { info, isLoading: infoLoading, update } = usePayrollUserInfo(userId);
    const { commissionTypes, isLoading: typesLoading } = usePayrollCommissionTypes();

    const user = users.find((u) => u.id === userId);

    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [bankName, setBankName] = useState("");
    const [bankAccountNumber, setBankAccountNumber] = useState("");
    const [bankAccountHolder, setBankAccountHolder] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (info) {
            setSelectedTypeId(info.commissionTypeId ?? null);
            setBankName(info.bankName ?? "");
            setBankAccountNumber(info.bankAccountNumber ?? "");
            setBankAccountHolder(info.bankAccountHolder ?? "");
        }
    }, [info?.commissionTypeId, info?.bankName, info?.bankAccountNumber, info?.bankAccountHolder]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await update({
                commissionTypeId: selectedTypeId ?? undefined,
                bankName: bankName || null,
                bankAccountNumber: bankAccountNumber || null,
                bankAccountHolder: bankAccountHolder || null,
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const isLoading = infoLoading || typesLoading;

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="bg-white rounded-xl h-24 animate-pulse" />
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}
            </div>
        );
    }

    const enabledTypes = commissionTypes.filter((t) => t.isEnabled);

    return (
        <div className="space-y-4">
            {/* User Info Card */}
            {user && (
                <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                    <InitialsAvatar name={user.fullName} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-lg font-semibold text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-sm text-gray-500">{ROLE_LABEL[user.role] ?? user.role}</p>
                        <p className="text-sm text-gray-400 truncate">{user.email}</p>
                        {user.phoneNumber && (
                            <p className="text-sm text-gray-400">{user.phoneNumber}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Commission Type */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Commission Type</p>

                <button
                    onClick={() => setSelectedTypeId(null)}
                    className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-gray-50"
                >
                    <div>
                        <p className="text-base font-medium text-gray-900 text-left">None</p>
                        <p className="text-sm text-gray-400 text-left">No commission assigned</p>
                    </div>
                    {selectedTypeId === null && <Check size={20} className="text-brand shrink-0" />}
                </button>

                {enabledTypes.length === 0 ? (
                    <p className="text-sm text-gray-400 px-1">No commission types configured yet.</p>
                ) : (
                    enabledTypes.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setSelectedTypeId(type.id)}
                            className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-gray-50"
                        >
                            <div>
                                <p className="text-base font-medium text-gray-900 text-left">{type.name}</p>
                                <p className="text-sm text-gray-400 text-left font-mono">
                                    Rp {type.ratePerCup.toLocaleString("id-ID")} / cup
                                </p>
                            </div>
                            {selectedTypeId === type.id && <Check size={20} className="text-brand shrink-0" />}
                        </button>
                    ))
                )}
            </div>

            {/* Bank Info */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Bank Details</p>
                <div className="bg-white rounded-xl p-4 space-y-4">
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-700">Bank Name</p>
                        <TextInput value={bankName} onChange={setBankName} placeholder="e.g. BCA" className="text-base font-medium" />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-700">Account Number</p>
                        <TextInput value={bankAccountNumber} onChange={setBankAccountNumber} placeholder="e.g. 1234567890" className="text-base font-medium" />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium text-gray-700">Account Holder</p>
                        <TextInput value={bankAccountHolder} onChange={setBankAccountHolder} placeholder="e.g. Budi Santoso" className="text-base font-medium" />
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-red-500 px-1">{error}</p>}

            <FormFooter
                label="Save Changes"
                loadingLabel="Saving..."
                onSubmit={handleSave}
                isLoading={saving}
            />
        </div>
    );
}
