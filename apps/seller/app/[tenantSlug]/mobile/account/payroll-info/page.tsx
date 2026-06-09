"use client";

import { useState } from "react";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { FormFooter } from "@/components/shared/FormFooter";
import type { PayrollUserInfoResponse } from "@tea-pos/features/payroll-user-info/schema";

function PayrollInfoForm({ info, update }: {
    info: PayrollUserInfoResponse | null;
    update: (input: { bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string }) => Promise<PayrollUserInfoResponse>;
}) {
    const [bankName, setBankName] = useState(info?.bankName ?? "");
    const [bankAccountNumber, setBankAccountNumber] = useState(info?.bankAccountNumber ?? "");
    const [bankAccountHolder, setBankAccountHolder] = useState(info?.bankAccountHolder ?? "");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSaved(false);
        try {
            await update({
                bankName: bankName.trim() || undefined,
                bankAccountNumber: bankAccountNumber.trim() || undefined,
                bankAccountHolder: bankAccountHolder.trim() || undefined,
            });
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <div className="space-y-3 flex-1">
                <div className="bg-white rounded-xl p-4 space-y-4">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Bank Details</p>

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
                        <input
                            type="text"
                            inputMode="numeric"
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value)}
                            placeholder="e.g. 1234567890"
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand/40"
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
                    {saved && <p className="text-sm text-green-600">Saved successfully.</p>}
                </div>
            </div>

            <FormFooter
                label="Save"
                loadingLabel="Saving..."
                onSubmit={handleSave}
                isLoading={isSaving}
            />
        </>
    );
}

export default function PayrollInfoPage() {
    const { info, isLoading, update } = usePayrollUserInfo();

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-brand border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return <PayrollInfoForm key={info?.id ?? "new"} info={info} update={update} />;
}
