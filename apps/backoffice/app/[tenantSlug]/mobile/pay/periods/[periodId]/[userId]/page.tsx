"use client";

import { use, useState, useRef } from "react";
import { usePayslip, usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { payrollApi } from "@/lib/api/payroll";
import { apiFetch } from "@/lib/api/client";
import { parseISO, format, eachDayOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import { Copy, Check, Camera, X } from "lucide-react";
import Image from "next/image";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
function Divider() {
    return <p className="text-gray-300 text-xs tracking-tighter font-mono">{DIVIDER}</p>;
}
function Row({
    left,
    right,
    bold,
    muted,
}: {
    left: string;
    right?: string;
    bold?: boolean;
    muted?: boolean;
}) {
    return (
        <div
            className={`flex justify-between text-sm font-mono ${bold ? "font-bold text-gray-900" : muted ? "text-gray-400" : "text-gray-700"}`}
        >
            <span>{left}</span>
            {right && <span>{right}</span>}
        </div>
    );
}

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

export default function UserPayDetailPage({
    params,
}: {
    params: Promise<{ periodId: string; userId: string }>;
}) {
    const { periodId, userId } = use(params);
    const { payslip, isLoading, mutate } = usePayslip(periodId, userId);
    const { users } = useTenantUsers();
    const { info: payrollUserInfo } = usePayrollUserInfo(userId);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPaySheet, setShowPaySheet] = useState(false);

    const targetUser = users.find((u) => u.id === userId);

    const handleUpsertPayout = async () => {
        setActionLoading(true);
        try {
            await payrollApi.upsertPayout({ periodId, userId });
            await mutate();
        } finally {
            setActionLoading(false);
        }
    };

    const handleAction = async (status: "approved" | "on_hold") => {
        const ps = payslip as { payout?: { id: string } } | null;
        if (!ps?.payout?.id) return;
        setActionLoading(true);
        try {
            await payrollApi.updatePayout(ps.payout.id, { status });
            await mutate();
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) {
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
        } | null;
        commissions: Array<{ date: string; totalCups: number; grossPay: number }>;
        claims: Array<{
            id: string;
            claimTypeName?: string | null;
            claimTypeId: string | null;
            amount: number;
            status: string;
        }>;
        commissionsTotal: number;
        claimsTotal: number;
        totalPay: number;
        ratePerUnit: number;
    };

    const { period, payout, commissions, claims, commissionsTotal, claimsTotal, totalPay, ratePerUnit } =
        ps;
    const status = payout?.status ?? null;
    const weekNum = getISOWeek(parseISO(period.startDate));
    const weekYear = getISOWeekYear(parseISO(period.startDate));
    const days = eachDayOfInterval({
        start: parseISO(period.startDate),
        end: parseISO(period.endDate),
    });
    const commissionsByDate = commissions.reduce<Record<string, typeof commissions[0][]>>(
        (acc, e) => {
            if (!acc[e.date]) acc[e.date] = [];
            acc[e.date].push(e);
            return acc;
        },
        {},
    );
    const totalCups = commissions.reduce((s, e) => s + e.totalCups, 0);
    const approvedClaims = claims.filter((c) => c.status === "approved" || c.status === "paid");
    const hasBankInfo = payrollUserInfo?.bankName || payrollUserInfo?.bankAccountNumber;

    return (
        <div className="space-y-4 pb-32">
            {/* Bank info from payroll_user_info */}
            <div className="bg-white rounded-xl p-4 space-y-2">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    Bank Account
                </p>
                {hasBankInfo ? (
                    <>
                        <p className="text-base font-semibold text-gray-900">
                            {targetUser?.fullName}
                        </p>
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

            {/* Receipt */}
            <div className="bg-white rounded-xl p-4 space-y-1 font-mono">
                <div className="text-center space-y-0.5 mb-2">
                    <Divider />
                    <p className="text-base font-bold text-gray-900 tracking-widest pt-2">
                        {targetUser?.fullName ?? "Staff"}
                    </p>
                    <p className="text-sm text-gray-600">
                        Week {weekNum}, {weekYear}
                    </p>
                    <p className="text-sm text-gray-600">
                        {format(parseISO(period.startDate), "MMM d")} –{" "}
                        {format(parseISO(period.endDate), "MMM d")}
                    </p>
                    <div className="pb-2" />
                    <Divider />
                </div>

                <div className="space-y-1 py-1">
                    {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayEntries = commissionsByDate[dateStr] ?? [];
                        if (dayEntries.length === 0)
                            return (
                                <Row key={dateStr} left={format(day, "EEE d MMM")} right="—" muted />
                            );
                        return dayEntries.map((e, i) => (
                            <Row
                                key={`${dateStr}-${i}`}
                                left={i === 0 ? format(day, "EEE d MMM") : ""}
                                right={`${e.totalCups} cups`}
                            />
                        ));
                    })}
                </div>

                <Divider />
                <Row left={`${totalCups} cups × Rp ${ratePerUnit.toLocaleString("id-ID")}`} />
                <Row
                    left="Commissions"
                    right={`Rp ${commissionsTotal.toLocaleString("id-ID")}`}
                    bold
                />
                <Divider />

                {approvedClaims.length > 0 && (
                    <>
                        <Row left="CLAIMS" />
                        {approvedClaims.map((c) => (
                            <Row
                                key={c.id}
                                left={c.claimTypeName ?? c.claimTypeId ?? "—"}
                                right={`Rp ${c.amount.toLocaleString("id-ID")}`}
                            />
                        ))}
                        <Divider />
                    </>
                )}

                <Row left="TOTAL" right={`Rp ${totalPay.toLocaleString("id-ID")}`} bold />
                <Divider />

                {status === "paid" && payout?.paidAt && (
                    <div className="pt-2 text-center space-y-1">
                        <p className="text-sm font-bold text-green-600">
                            PAID · {format(new Date(payout.paidAt), "d MMM yyyy")}
                        </p>
                        {payout.paymentProofUrl && (
                            <Image
                                src={payout.paymentProofUrl}
                                alt="proof"
                                width={300}
                                height={200}
                                className="rounded-xl w-full object-cover max-h-40 mt-2"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            {status === null && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
                    <button
                        onClick={handleUpsertPayout}
                        disabled={actionLoading}
                        className="w-full py-3.5 bg-brand text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                    >
                        {actionLoading ? "Loading..." : "Load Payout"}
                    </button>
                </div>
            )}

            {status === "pending" && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => handleAction("on_hold")}
                        disabled={actionLoading}
                        className="flex-1 py-3.5 bg-amber-100 text-amber-700 font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                    >
                        Put On Hold
                    </button>
                    <button
                        onClick={() => handleAction("approved")}
                        disabled={actionLoading}
                        className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                    >
                        {actionLoading ? "..." : "Approve"}
                    </button>
                </div>
            )}

            {status === "approved" && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => handleAction("on_hold")}
                        disabled={actionLoading}
                        className="flex-1 py-3.5 bg-amber-100 text-amber-700 font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                    >
                        Mark On Hold
                    </button>
                    <button
                        onClick={() => setShowPaySheet(true)}
                        disabled={actionLoading}
                        className="flex-1 py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80"
                    >
                        Pay
                    </button>
                </div>
            )}

            {status === "on_hold" && (
                <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-white border-t border-gray-100">
                    <button
                        onClick={() => handleAction("approved")}
                        disabled={actionLoading}
                        className="w-full py-3.5 bg-green-600 text-white font-bold rounded-xl active:opacity-80 disabled:opacity-40"
                    >
                        {actionLoading ? "..." : "Approve"}
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
