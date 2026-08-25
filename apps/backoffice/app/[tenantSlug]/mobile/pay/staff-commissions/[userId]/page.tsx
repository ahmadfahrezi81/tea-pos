"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionConfigs } from "@/lib/hooks/payroll-commission-configs/usePayrollCommissionConfigs";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { FormFooter } from "@/components/shared/FormFooter";
import { Check, UserCircle } from "lucide-react";
import Image from "next/image";
import { useErrorSheet } from "@/lib/context/ErrorSheetContext";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

export default function StaffCommissionPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { users } = useTenantUsers();
    const { info, isLoading: infoLoading, update } = usePayrollUserInfo(userId);
    const { commissionTypes, isLoading: typesLoading } = usePayrollCommissionConfigs();
    const { showError } = useErrorSheet();

    const user = users.find((u) => u.id === userId);

    /* The selection is what the admin picked, falling back to what is stored —
       not a copy of the stored value synced across by an effect. Copying meant
       a render, an effect, and a second render on every load, and it silently
       depended on `info` never changing again afterwards. `undefined` is
       "untouched" here, distinct from `null`, which is a deliberate "None". */
    const [picked, setPicked] = useState<string | null | undefined>(undefined);
    const selectedTypeId = picked !== undefined ? picked : (info?.commissionConfigId ?? null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await update({ commissionConfigId: selectedTypeId ?? undefined });
            router.back();
        } catch (err) {
            showError(err);
        } finally {
            setSaving(false);
        }
    };

    const isLoading = infoLoading || typesLoading;

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 space-y-2.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton delay={80} className="h-3.5 w-24" />
                </div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 flex items-center justify-between">
                        <Skeleton delay={i * 90} className="h-4 w-32" />
                        <Skeleton delay={i * 90 + 60} className="h-4 w-16" />
                    </div>
                ))}
            </div>
        );
    }

    if (!user) return <p className="p-4 text-sm text-gray-400">Staff member not found.</p>;

    const enabledTypes = commissionTypes.filter((t) => t.isEnabled);

    return (
        <div className="space-y-4">
            {/* Who this applies to — the list you came from is all staff, so the
                name needs to be unmistakable before you change a pay rate. */}
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

            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Commission Type</p>

                <button
                    onClick={() => setPicked(null)}
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
                            onClick={() => setPicked(type.id)}
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

            <FormFooter
                label="Save Changes"
                loadingLabel="Saving..."
                onSubmit={handleSave}
                isLoading={saving}
                confirmTitle="Save pay settings?"
                confirmMessage="This changes their commission type for future closed days."
            />
        </div>
    );
}
