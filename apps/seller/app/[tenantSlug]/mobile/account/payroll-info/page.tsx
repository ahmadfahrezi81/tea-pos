"use client";

import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useT } from "@/lib/hooks/useT";

const FieldRow = ({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="py-4 border-b border-gray-100 last:border-none">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <div className="flex items-center justify-between gap-3">
                <p className="text-base text-gray-900 font-medium">{value || "—"}</p>
                {copyable && value && (
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

export default function PayrollInfoPage() {
    const { info, isLoading } = usePayrollUserInfo();
    const t = useT();

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl px-4">
                {isLoading ? (
                    <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
                ) : (
                    <>
                        <FieldRow label={t("account.bankName")} value={info?.bankName ?? ""} />
                        <FieldRow label={t("account.accountNumber")} value={info?.bankAccountNumber ?? ""} copyable />
                        <FieldRow label={t("account.accountHolder")} value={info?.bankAccountHolder ?? ""} />
                    </>
                )}
            </div>
        </div>
    );
}
