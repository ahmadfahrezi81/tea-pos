"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { NumberInput } from "../../../../../home/manage/_components/shared/NumberInput";
import type { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

function EditForm({ info, update }: {
    info: PayrollUserInfoResponse | null;
    update: (input: { bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string }) => Promise<PayrollUserInfoResponse>;
}) {
    const router = useRouter();
    const [bankName, setBankName] = useState(info?.bankName ?? "");
    const [bankAccountNumber, setBankAccountNumber] = useState(info?.bankAccountNumber ?? "");
    const [bankAccountHolder, setBankAccountHolder] = useState(info?.bankAccountHolder ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await update({
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber.trim() || undefined,
                bankAccountHolder: bankAccountHolder.trim() || undefined,
            });
            router.back();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Bank name</p>
                    <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. BCA, Mandiri, BNI"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Account number</p>
                    <NumberInput
                        compact
                        asString
                        value={bankAccountNumber}
                        onChange={setBankAccountNumber}
                        placeholder="1234567890"
                    />
                </div>
                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500">Account holder name</p>
                    <input
                        type="text"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        placeholder="As printed on the account"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full py-4 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40 text-base"
            >
                {isSaving ? "Saving..." : "Save"}
            </button>
        </div>
    );
}

export default function EditPayrollInfoPage() {
    const { info, isLoading, update } = usePayrollUserInfo();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <EditForm key={info?.id ?? "new"} info={info} update={update} />;
}
