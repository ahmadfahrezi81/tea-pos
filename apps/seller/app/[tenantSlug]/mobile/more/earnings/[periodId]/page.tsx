"use client";

import { use } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayslip";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useAuth } from "@/lib/context/AuthContext";
import { parseISO, format, eachDayOfInterval, getISOWeek, getISOWeekYear } from "date-fns";
import Image from "next/image";
import { useState } from "react";
import { useT } from "@/lib/hooks/useT";
import CopyableField from "@/components/shared/CopyableField";

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

const STATUS_COLORS: Record<string, string> = {
    pending: "text-gray-500",
    approved: "text-blue-600",
    on_hold: "text-amber-600",
    paid: "text-green-600",
};

const STATUS_PILL: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    approved: "bg-blue-100 text-blue-700",
    on_hold: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
};

export default function PayslipPage({ params }: { params: Promise<{ periodId: string }> }) {
    const { periodId } = use(params);
    const { payslip, isLoading } = usePayslip(periodId);
    const { info: payrollInfo } = usePayrollUserInfo();
    const { user } = useAuth();
    const [showProof, setShowProof] = useState(false);
    const t = useT();

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl h-20 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!payslip || !("period" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">{t("earnings.periodNotFound")}</p>;
    }

    const ps = payslip as {
        period: { id: string; startDate: string; endDate: string };
        payout: { status: string; paidAt: string | null; paymentProofUrl: string | null } | null;
        commissions: Array<{ date: string; totalCups: number; grossPay: number; ratePerCup: number; storeName?: string | null }>;
        claims: Array<{ id: string; claimTypeName?: string | null; claimTypeId: string | null; amount: number; status: string }>;
        commissionsTotal: number;
        claimsTotal: number;
        totalPay: number;
        ratePerCup: number;
    };

    const {
        period,
        payout,
        commissions,
        claims,
        commissionsTotal,
        claimsTotal,
        totalPay,
        ratePerCup,
    } = ps;

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
    const status = payout?.status ?? "pending";
    const approvedClaims = claims.filter((c) => c.status === "approved" || c.status === "paid");
    const pendingClaims = claims.filter((c) => c.status === "pending");

    const hasBankInfo = payrollInfo?.bankName || payrollInfo?.bankAccountNumber;

    return (
        <div className="space-y-3 pb-4">
            {/* Details */}
            <div className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xl text-gray-800 leading-tight">
                        Week {weekNum}, {weekYear}
                    </h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-sm font-medium ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>
                        {status === "pending" ? t("earnings.statusWaiting") : status === "approved" ? t("earnings.statusReady") : status === "on_hold" ? t("earnings.statusReview") : status === "paid" ? t("earnings.statusPaid") : status}
                    </span>
                </div>
                <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t("earnings.periodLabel")}</span>
                        <span className="font-medium text-gray-800">
                            {format(parseISO(period.startDate), "MMM d")} – {format(parseISO(period.endDate), "MMM d")}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t("earnings.forLabel")}</span>
                        <span className="font-medium text-gray-800">{user?.fullName ?? t("common.unknown")}</span>
                    </div>
                    <div className="pt-1.5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-gray-500">{t("earnings.payslipId")}</span>
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-gray-400">{period.id.slice(0, 8)}…</span>
                            <CopyableField label={t("earnings.payslipId")} value={period.id} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 space-y-1 font-mono">
                {/* Header */}
                <div className="text-center space-y-0.5 mb-2">
                    <Divider />
                    <p className="text-base font-bold text-gray-900 tracking-widest pt-2">MY PAY</p>
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

                {/* Day breakdown */}
                <div className="space-y-1 py-1">
                    {days.map((day) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayEntries = commissionsByDate[dateStr] ?? [];
                        if (dayEntries.length === 0) {
                            return <Row key={dateStr} left={format(day, "EEE d MMM")} right="—" muted />;
                        }
                        const dayTotalCups = dayEntries.reduce((s, e) => s + e.totalCups, 0);
                        return (
                            <div key={dateStr} className="space-y-0.5">
                                <Row left={format(day, "EEE d MMM")} right={`${dayTotalCups} ${t("earnings.cups")}`} />
                                {dayEntries.map((e, i) => (
                                    <Row
                                        key={`${dateStr}-${i}`}
                                        left={`  → ${e.storeName ?? "—"}`}
                                        right={`${e.totalCups} ${t("earnings.cups")}`}
                                        muted
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>

                <Divider />
                <Row
                    left={`${totalCups} ${t("earnings.cups")} × Rp ${ratePerCup.toLocaleString("id-ID")}`}
                />
                <Row
                    left={t("earnings.commissionsRow")}
                    right={`Rp ${commissionsTotal.toLocaleString("id-ID")}`}
                    bold
                />
                <Divider />

                {/* Claims */}
                {(approvedClaims.length > 0 || pendingClaims.length > 0) && (
                    <>
                        <Row left={t("earnings.claimsRow").toUpperCase()} />
                        {approvedClaims.map((c) => (
                            <Row
                                key={c.id}
                                left={c.claimTypeName ?? c.claimTypeId ?? "—"}
                                right={`Rp ${c.amount.toLocaleString("id-ID")}`}
                            />
                        ))}
                        {pendingClaims.map((c) => (
                            <Row
                                key={c.id}
                                left={c.claimTypeName ?? c.claimTypeId ?? "—"}
                                right={t("earnings.pendingReview")}
                                muted
                            />
                        ))}
                        <Divider />
                    </>
                )}

                <Row left={t("earnings.totalRow").toUpperCase()} right={`Rp ${totalPay.toLocaleString("id-ID")}`} bold />
                <Divider />
            </div>

            {/* Status */}
            <div className="bg-white rounded-2xl p-4 text-center space-y-2">
                <p className={`text-sm font-bold tracking-wide ${STATUS_COLORS[status] ?? "text-gray-500"}`}>
                    {status === "pending" ? t("earnings.statusWaitingLong") : status === "approved" ? t("earnings.statusReadyLong") : status === "on_hold" ? t("earnings.statusReviewLong") : status === "paid" ? t("earnings.statusPaidLong") : status.toUpperCase()}
                </p>
                {status === "paid" && payout?.paidAt && (
                    <p className="text-xs text-gray-500">
                        {format(new Date(payout.paidAt), "d MMM yyyy")}
                    </p>
                )}
                {status === "paid" && (
                    <>
                        {hasBankInfo && (
                            <p className="text-xs text-gray-500">
                                {payrollInfo?.bankName} · {payrollInfo?.bankAccountNumber}
                            </p>
                        )}
                        {payout?.paymentProofUrl && (
                            <>
                                <button
                                    onClick={() => setShowProof(true)}
                                    className="text-xs text-brand active:opacity-70 underline"
                                >
                                    {t("earnings.viewProof")}
                                </button>
                                {showProof && (
                                    <div
                                        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                                        onClick={() => setShowProof(false)}
                                    >
                                        <Image
                                            src={payout.paymentProofUrl}
                                            alt="Transfer proof"
                                            width={400}
                                            height={400}
                                            className="rounded-xl max-h-[80vh] w-auto object-contain"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
                {!hasBankInfo && status !== "paid" && (
                    <p className="text-xs text-amber-600">
                        {t("earnings.addBankDetails")}
                    </p>
                )}
            </div>
        </div>
    );
}
