"use client";

import { use, useState, useRef, useEffect } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayroll";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { payrollApi } from "@/lib/api/payroll";
import { apiFetch } from "@/lib/api/client";
import { parseISO, format, eachDayOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import { Copy, Check, Camera, X, ChevronRight } from "lucide-react";
import Image from "next/image";

function CopyableValue({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1 text-base font-medium text-gray-900 active:opacity-70"
        >
            {value}
            {copied ? (
                <Check size={14} className="text-green-500" />
            ) : (
                <Copy size={14} className="text-gray-400" />
            )}
        </button>
    );
}

function PaySheet({
    payoutId,
    totalPay,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    onClose,
    onPaid,
}: {
    payoutId: string;
    totalPay: number;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountHolder: string | null;
    onClose: () => void;
    onPaid: () => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = (file: File) => {
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
    };

    const handleConfirm = async () => {
        if (!proofFile) {
            setError("Please upload a transfer screenshot.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", proofFile);
            form.append("bucket", "payroll-proofs");
            const { url: proofUrl } = await apiFetch<{ url: string }>("/api/upload", {
                method: "POST",
                body: form,
            });
            await payrollApi.updatePayout(payoutId, { status: "paid", paymentProofUrl: proofUrl });
            onPaid();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to confirm payment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end bg-black/40"
            onClick={onClose}
        >
            <div
                className="w-full bg-white rounded-t-2xl p-5 pb-8 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900">Confirm Payment</p>
                    <button onClick={onClose}>
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                    <p className="text-2xl font-bold text-gray-900">
                        Rp {totalPay.toLocaleString("id-ID")}
                    </p>
                    {bankName && <p className="text-sm text-gray-600">{bankName}</p>}
                    {bankAccountNumber && (
                        <p className="text-base font-medium text-gray-900">{bankAccountNumber}</p>
                    )}
                    {bankAccountHolder && (
                        <p className="text-sm text-gray-500">{bankAccountHolder}</p>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Transfer screenshot</p>
                    {proofPreview ? (
                        <div className="relative">
                            <Image
                                src={proofPreview}
                                alt="proof"
                                width={400}
                                height={200}
                                className="rounded-xl w-full object-cover max-h-40"
                            />
                            <button
                                onClick={() => {
                                    setProofFile(null);
                                    setProofPreview(null);
                                }}
                                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow"
                            >
                                <X size={16} className="text-gray-600" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 active:bg-gray-50"
                        >
                            <Camera size={24} className="text-gray-400" />
                            <p className="text-sm text-gray-500">Tap to upload screenshot</p>
                        </button>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                        }}
                    />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
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

export default function UserPayWeekSummaryPage({
    params,
}: {
    params: Promise<{ periodId: string; userId: string }>;
}) {
    const { periodId, userId } = use(params);
    const { url } = useTenantSlug();
    const { payslip, isLoading, mutate } = usePayslip(periodId, userId);
    const { users } = useTenantUsers();
    const { info: payrollUserInfo } = usePayrollUserInfo(userId);
    const [showPaySheet, setShowPaySheet] = useState(false);
    const [refreshing, setRefreshing] = useState(true);

    const targetUser = users.find((u) => u.id === userId);

    // Recompute approved-only totals on every view — no manual "Load Payout" step.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await payrollApi.upsertPayout({ periodId, userId });
                if (!cancelled) await mutate();
            } finally {
                if (!cancelled) setRefreshing(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodId, userId]);

    if (isLoading || refreshing) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!payslip || !("period" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">Period not found.</p>;
    }

    const ps = payslip as {
        period: { startDate: string; endDate: string };
        payout: {
            id: string;
            status: string;
            paidAt: string | null;
            paymentProofUrl: string | null;
            commissionsTotal: number;
            claimsTotal: number;
            totalPay: number;
        } | null;
        commissions: Array<{ id: string; date: string; totalCups: number; grossPay: number; status: string }>;
        claims: Array<{ id: string; date: string; amount: number; status: string }>;
    };

    const { period, payout, commissions, claims } = ps;
    const weekNum = getISOWeek(parseISO(period.startDate));
    const weekYear = getISOWeekYear(parseISO(period.startDate));
    const days = eachDayOfInterval({ start: parseISO(period.startDate), end: parseISO(period.endDate) });

    const pendingCount =
        commissions.filter((c) => c.status === "pending").length +
        claims.filter((c) => c.status === "pending").length;

    const hasBankInfo = payrollUserInfo?.bankName || payrollUserInfo?.bankAccountNumber;
    const status = payout?.status ?? "pending";
    const totalPay = payout?.totalPay ?? 0;

    return (
        <div className="space-y-4 pb-32">
            <div className="bg-white rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bank Account</p>
                {hasBankInfo ? (
                    <>
                        <p className="text-base font-semibold text-gray-900">{targetUser?.fullName}</p>
                        {payrollUserInfo?.bankName && (
                            <p className="text-sm text-gray-600">{payrollUserInfo.bankName}</p>
                        )}
                        {payrollUserInfo?.bankAccountNumber && (
                            <CopyableValue value={payrollUserInfo.bankAccountNumber} />
                        )}
                        {payrollUserInfo?.bankAccountHolder && (
                            <p className="text-sm text-gray-400">{payrollUserInfo.bankAccountHolder}</p>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-amber-600">No bank account set for this user.</p>
                )}
            </div>

            <div className="bg-white rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-base font-bold text-gray-900">{targetUser?.fullName ?? "Staff"}</p>
                        <p className="text-sm text-gray-500">
                            Week {weekNum}, {weekYear} · {format(parseISO(period.startDate), "MMM d")}–
                            {format(parseISO(period.endDate), "MMM d")}
                        </p>
                    </div>
                    <p className="text-xl font-bold text-gray-900">Rp {totalPay.toLocaleString("id-ID")}</p>
                </div>
                {pendingCount > 0 && (
                    <div className="bg-amber-50 rounded-lg px-3 py-2 mt-1">
                        <p className="text-sm text-amber-700 font-medium">
                            {pendingCount} item{pendingCount !== 1 ? "s" : ""} still pending review
                        </p>
                    </div>
                )}
                {status === "paid" && payout?.paidAt && (
                    <div className="bg-green-50 rounded-lg px-3 py-2 mt-1">
                        <p className="text-sm text-green-700 font-medium">
                            Paid · {format(new Date(payout.paidAt), "d MMM yyyy")}
                        </p>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {days.map((day) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const dayCommissions = commissions.filter((c) => c.date === dateStr);
                    const dayClaims = claims.filter((c) => c.date === dateStr);
                    const subtotal =
                        dayCommissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.grossPay, 0) +
                        dayClaims.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0);
                    const dayPendingCount =
                        dayCommissions.filter((c) => c.status === "pending").length +
                        dayClaims.filter((c) => c.status === "pending").length;
                    const hasItems = dayCommissions.length > 0 || dayClaims.length > 0;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => navigation.push(url(`/mobile/pay/periods/${periodId}/${userId}/day/${dateStr}`))}
                            disabled={!hasItems}
                            className={`w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left ${hasItems ? "active:bg-gray-50" : "opacity-50"}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-semibold text-gray-900">{format(day, "EEE d MMM")}</span>
                                    {dayPendingCount > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                            {dayPendingCount} pending
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {hasItems ? `Rp ${subtotal.toLocaleString("id-ID")}` : "No activity"}
                                </p>
                            </div>
                            {hasItems && <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                        </button>
                    );
                })}
            </div>

            {status === "pending" && pendingCount === 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
                    <button
                        onClick={() => setShowPaySheet(true)}
                        className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80"
                    >
                        Pay
                    </button>
                </div>
            )}

            {showPaySheet && payout && (
                <PaySheet
                    payoutId={payout.id}
                    totalPay={totalPay}
                    bankName={payrollUserInfo?.bankName ?? null}
                    bankAccountNumber={payrollUserInfo?.bankAccountNumber ?? null}
                    bankAccountHolder={payrollUserInfo?.bankAccountHolder ?? null}
                    onClose={() => setShowPaySheet(false)}
                    onPaid={async () => {
                        setShowPaySheet(false);
                        await mutate();
                    }}
                />
            )}
        </div>
    );
}
