"use client";

import { use, useState } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayroll";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { payrollApi } from "@/lib/api/payroll";
import { apiFetch } from "@/lib/api/client";
import { Copy, Check } from "lucide-react";
import { PhotoPicker } from "@/components/shared/PhotoPicker";

function CopyableValue({ value, prefix, className }: { value: string; prefix?: string; className?: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className={`flex items-center gap-1.5 active:opacity-70 ${className ?? "text-base font-medium text-gray-900"}`}
        >
            {prefix}{value}
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
        </button>
    );
}

export default function PayConfirmPage({
    params,
    searchParams,
}: {
    params: Promise<{ payoutId: string }>;
    searchParams: Promise<{ userId?: string }>;
}) {
    const { payoutId } = use(params);
    const { userId } = use(searchParams);
    const { url } = useTenantSlug();
    const { payslip, isLoading: payslipLoading } = usePayslip(payoutId, userId);
    const { info: payrollUserInfo, isLoading: infoLoading } = usePayrollUserInfo(userId ?? "");
    const { users } = useTenantUsers();
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const targetUser = users.find((u) => u.id === userId);
    const userParam = userId ? `?userId=${userId}` : "";

    const handleConfirm = async () => {
        if (!proofFile) { setError("Please attach a transfer screenshot."); return; }
        setSubmitting(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", proofFile);
            form.append("bucket", "payroll-proofs");
            const { url: proofUrl } = await apiFetch<{ url: string }>("/api/upload", { method: "POST", body: form });
            await payrollApi.updatePayout(payoutId, { status: "paid", paymentProofUrl: proofUrl });
            navigation.push(url(`/mobile/pay/payouts/${payoutId}${userParam}`));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm payment");
            setSubmitting(false);
        }
    };

    if (payslipLoading || infoLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />)}
            </div>
        );
    }

    const ps = payslip as { payout: { totalPay: number } } | null;
    const totalPay = ps?.payout?.totalPay ?? 0;

    return (
        <div className="space-y-4 pb-32">
            {/* Amount */}
            <div className="bg-white rounded-xl p-4 space-y-1">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Amount to Pay</p>
                <CopyableValue value={totalPay.toLocaleString("id-ID")} prefix="Rp " className="text-3xl font-bold text-gray-900" />
            </div>

            {/* Bank details */}
            <div className="bg-white rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Staff</span>
                    <span className="font-medium text-gray-800">{targetUser?.fullName ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-medium text-gray-800">{payrollUserInfo?.bankName ?? "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account No.</span>
                    {payrollUserInfo?.bankAccountNumber
                        ? <CopyableValue value={payrollUserInfo.bankAccountNumber} />
                        : <span className="font-medium text-amber-600">Not set</span>}
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-500">Account Name</span>
                    <span className="font-medium text-gray-800">{payrollUserInfo?.bankAccountHolder ?? "—"}</span>
                </div>
            </div>

            {/* Proof upload */}
            <div className="bg-white rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Transfer Screenshot</p>
                <PhotoPicker
                    previewUrl={proofPreview}
                    onCapture={(file, previewUrl) => { setProofFile(file); setProofPreview(previewUrl); }}
                    onRemove={() => { setProofFile(null); setProofPreview(null); }}
                    onError={(msg) => setError(msg)}
                    allowGallery
                />
            </div>

            {error && (
                <div className="bg-red-50 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
                <button
                    onClick={handleConfirm}
                    disabled={submitting || !proofFile}
                    className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                >
                    {submitting ? "Confirming..." : "Confirm Payment"}
                </button>
            </div>
        </div>
    );
}
