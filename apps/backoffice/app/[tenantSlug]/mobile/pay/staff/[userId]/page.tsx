"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { FormFooter } from "@/components/shared/FormFooter";
import { Check, UserCircle } from "lucide-react";
import Image from "next/image";

export default function StaffPayrollInfoPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { users } = useTenantUsers();
    const { info, isLoading: infoLoading, update } = usePayrollUserInfo(userId);
    const { commissionTypes, isLoading: typesLoading } = usePayrollCommissionTypes();

    const user = users.find((u) => u.id === userId);

    const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (info) {
            setSelectedTypeId(info.commissionTypeId ?? null);
        }
    }, [info?.commissionTypeId]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await update({ commissionTypeId: selectedTypeId ?? undefined });
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
    const hasBankInfo = info?.bankName || info?.bankAccountNumber;

    return (
        <div className="space-y-4">
            {/* User card */}
            {user && (
                <div className="bg-white rounded-xl p-4 flex items-center gap-4">
                    {user.avatarUrl ? (
                        <Image
                            src={user.avatarUrl}
                            alt={user.fullName}
                            width={56}
                            height={56}
                            className="w-14 h-14 rounded-2xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
                            <UserCircle size={32} className="text-brand" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-lg font-semibold text-gray-900 truncate">{user.fullName}</p>
                        <p className="text-sm text-gray-400 truncate">{user.email}</p>
                    </div>
                </div>
            )}

            {/* Commission type */}
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

            {/* Bank details — read-only */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Bank Details</p>
                <div className="bg-white rounded-xl px-4">
                    {hasBankInfo ? (
                        <>
                            {info?.bankName && (
                                <div className="py-3.5 border-b border-gray-100">
                                    <p className="text-xs text-gray-400 mb-0.5">Bank</p>
                                    <p className="text-base font-medium text-gray-900">{info.bankName}</p>
                                </div>
                            )}
                            {info?.bankAccountNumber && (
                                <div className="py-3.5 border-b border-gray-100">
                                    <p className="text-xs text-gray-400 mb-0.5">Account number</p>
                                    <p className="text-base font-medium text-gray-900 font-mono">{info.bankAccountNumber}</p>
                                </div>
                            )}
                            {info?.bankAccountHolder && (
                                <div className="py-3.5">
                                    <p className="text-xs text-gray-400 mb-0.5">Account holder</p>
                                    <p className="text-base font-medium text-gray-900">{info.bankAccountHolder}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="py-4 text-sm text-gray-400">No bank details set by staff yet.</p>
                    )}
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
