"use client";

import { use } from "react";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { usePayrollCommissionTypes } from "@/lib/hooks/payroll-commission-types/usePayrollCommissionTypes";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { UserCircle, Pencil } from "lucide-react";
import Image from "next/image";

/**
 * Read-only. Changing someone's commission type lives under Pay -> Config ->
 * Staff Commissions: it is a payroll setting that decides what people are paid,
 * not a detail of the record you are looking at, and it does not belong behind
 * a screen an admin opens to check a bank account number.
 */
export default function StaffPayrollInfoPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { users } = useTenantUsers();
    const { info, isLoading: infoLoading } = usePayrollUserInfo(userId);
    const { commissionTypes, isLoading: typesLoading } = usePayrollCommissionTypes();
    const { url } = useTenantSlug();

    const user = users.find((u) => u.id === userId);
    const isLoading = infoLoading || typesLoading;

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="bg-white rounded-xl h-24 animate-pulse" />
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}
            </div>
        );
    }

    if (!user) return <p className="p-4 text-sm text-gray-400">Staff member not found.</p>;

    const commissionType = info?.commissionConfigId
        ? commissionTypes.find((t) => t.id === info.commissionConfigId)
        : null;
    const hasBankInfo = info?.bankName || info?.bankAccountNumber;

    return (
        <div className="space-y-4">
            {/* User card */}
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

            {/* Commission type — display only, with a way through to where it is set */}
            <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Commission Type</p>
                <div className="bg-white rounded-xl px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        {commissionType ? (
                            <>
                                <p className="text-base font-medium text-gray-900 truncate">{commissionType.name}</p>
                                <p className="text-sm text-gray-400 font-mono">
                                    Rp {commissionType.ratePerCup.toLocaleString("id-ID")} / cup
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-base font-medium text-gray-900">None</p>
                                <p className="text-sm text-gray-400">No commission assigned</p>
                            </>
                        )}
                    </div>
                    <button
                        onClick={() => navigation.push(url(`/mobile/pay/staff-commissions/${userId}`))}
                        className="flex items-center gap-1.5 text-sm font-medium text-brand px-2 py-1 rounded-lg active:bg-brand/10 shrink-0"
                    >
                        <Pencil size={14} />
                        Change
                    </button>
                </div>
            </div>

            {/* Bank details — set by the staff member in the seller app */}
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
        </div>
    );
}
