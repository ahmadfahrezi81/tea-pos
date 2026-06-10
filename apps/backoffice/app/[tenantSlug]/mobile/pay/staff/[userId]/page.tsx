"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { FormFooter } from "@/components/shared/FormFooter";
import { Check } from "lucide-react";

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
        if (info) setSelectedTypeId(info.commissionTypeId ?? null);
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
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}
            </div>
        );
    }

    const enabledTypes = commissionTypes.filter((t) => t.isEnabled);

    return (
        <div className="space-y-4">
            {user && (
                <div className="bg-white rounded-xl p-4">
                    <p className="text-base font-semibold text-gray-900">{user.fullName}</p>
                    <p className="text-sm text-gray-400">{user.role}</p>
                </div>
            )}

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
