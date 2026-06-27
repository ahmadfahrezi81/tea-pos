"use client";

import { use, useState } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayslip";
import { useExpectedPayoutDate } from "@/lib/hooks/payroll/useExpectedPayoutDate";
import CopyableField from "@/components/shared/CopyableField";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { parseISO, format, eachDayOfInterval, getISOWeek } from "date-fns";
import Image from "next/image";
import { useT } from "@/lib/hooks/useT";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_PILL: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};

export default function PayslipPage({ params }: { params: Promise<{ payoutId: string }> }) {
    const { payoutId } = use(params);
    const { payslip, isLoading } = usePayslip(payoutId);
    const { info: payrollInfo } = usePayrollUserInfo();
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

    if (!payslip || !("payout" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">{t("earnings.periodNotFound")}</p>;
    }

    const ps = payslip as {
        payout: { id: string; startDate: string; endDate: string; status: string; paidAt: string | null; paymentProofUrl: string | null };
        commissions: Array<{ id: string; date: string; totalCups: number; totalCommission: number; ratePerCup: number; storeName?: string | null; status: string }>;
        claims: Array<{
            id: string;
            date: string;
            claimTypeName?: string | null;
            claimConfigId: string | null;
            amount: number;
            status: string;
        }>;
        commissionsTotal: number;
        claimsTotal: number;
        totalPay: number;
        ratePerCup: number;
        totalOrders: number;
        paidByName: string | null;
    };

    const { payout, commissions, claims, commissionsTotal, claimsTotal, totalPay, ratePerCup, totalOrders, paidByName } = ps;

    const status = payout.status;

    const weekStart = getISOWeek(parseISO(payout.startDate));
    const weekEnd = getISOWeek(parseISO(payout.endDate));
    const sameWeek = weekStart === weekEnd;
    const totalCups = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.totalCups, 0);
    const expectedPayoutDate = useExpectedPayoutDate(payout.endDate);

    const periodDays = eachDayOfInterval({
        start: parseISO(payout.startDate),
        end: parseISO(payout.endDate),
    });
    const week1 = periodDays.slice(0, 7);
    const week2 = periodDays.slice(7);
    const commissionDates = new Set(commissions.map((c) => c.date));

    const commissionsByDate = commissions.reduce<Record<string, typeof commissions>>((acc, c) => {
        if (!acc[c.date]) acc[c.date] = [];
        acc[c.date].push(c);
        return acc;
    }, {});

    const claimsByDate = claims.reduce<Record<string, typeof claims>>((acc, c) => {
        if (!acc[c.date]) acc[c.date] = [];
        acc[c.date].push(c);
        return acc;
    }, {});

    const allDates = [...new Set([
        ...Object.keys(commissionsByDate),
        ...Object.keys(claimsByDate),
    ])].sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-3 pb-24">
            {/* Totals */}
            <div className="bg-white p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">
                        {sameWeek ? `Week ${weekStart}` : `Week ${weekStart} · Week ${weekEnd}`}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>
                        {status === "pending" ? "Ongoing" : status === "paid" ? t("earnings.statusPaid") : status}
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">{totalOrders}</p>
                        <p className="text-sm text-gray-600">{t("analytics.orders")}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">{totalCups}</p>
                        <p className="text-sm text-gray-600">{t("analytics.cups")}</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">{t("earnings.totalRow")}</p>
                        <p className="text-xl font-bold text-green-600">{formatRupiah(totalPay)}</p>
                    </div>
                </div>
            </div>

            {/* Payout info */}
            <div className="bg-white p-4 rounded-2xl space-y-2 text-sm">
                {[
                    { label: "Payroll From", value: format(parseISO(payout.startDate), "EEE, d MMM yyyy") },
                    { label: "Payroll To", value: format(parseISO(payout.endDate), "EEE, d MMM yyyy") },
                    { label: "Per Cup", value: ratePerCup > 0 ? formatRupiah(ratePerCup) : "—" },
                    { label: "Expected payout", value: expectedPayoutDate ? format(parseISO(expectedPayoutDate), "EEE, d MMM yyyy") : "—" },
                    { label: "Paid on", value: payout.paidAt ? format(new Date(payout.paidAt), "d MMM yyyy") : "—" },
                    { label: "Paid by", value: paidByName ?? "—" },
                ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center">
                        <span className="text-gray-500">{label}</span>
                        <span className="font-medium text-gray-800">{value}</span>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                    <span className="text-gray-500">{t("earnings.payslipId")}</span>
                    <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-gray-400">{payout.id.slice(0, 8)}…</span>
                        <CopyableField label={t("earnings.payslipId")} value={payout.id} />
                    </div>
                </div>
                {payout.paymentProofUrl && (
                    <>
                        <button
                            onClick={() => setShowProof(true)}
                            className="w-full mt-1 py-2 rounded-xl bg-slate-100 text-sm font-medium text-gray-700 active:opacity-70"
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
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-2xl px-3 py-3 space-y-1.5">
                <div className="grid grid-cols-8 gap-1 mb-1">
                    <span />
                    {WEEKDAY_LABELS.map((d) => (
                        <span key={d} className="text-xs font-semibold text-gray-500 text-center">{d}</span>
                    ))}
                </div>
                {[week1, week2].filter((w) => w.length > 0).map((week, wi) => (
                    <div key={wi} className="grid grid-cols-8 gap-1 items-center">
                        <span className="text-xs font-semibold text-gray-500 text-center">
                            W{getISOWeek(week[0])}
                        </span>
                        {week.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const worked = commissionDates.has(dateKey);
                            return (
                                <div
                                    key={dateKey}
                                    className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md text-xs font-medium ${
                                        worked ? "bg-brand text-white font-semibold" : "bg-gray-100 text-gray-500"
                                    }`}
                                >
                                    {format(day, "d")}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Per-day cards */}
            <div className="space-y-3">
                {allDates.map((dateStr) => {
                    const dayCommissions = commissionsByDate[dateStr] ?? [];
                    const dayClaims = claimsByDate[dateStr] ?? [];
                    const allReviewed = [...dayCommissions, ...dayClaims].every(c => c.status !== "pending");
                    const dayApprovedCommissions = dayCommissions.filter(c => c.status === "approved").reduce((s, c) => s + c.totalCommission, 0);
                    const dayApprovedClaims = dayClaims.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0);
                    const dayApprovedTotal = dayApprovedCommissions + dayApprovedClaims;
                    const day = parseISO(dateStr);

                    return (
                        <div key={dateStr} className="bg-white rounded-2xl p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xl font-bold text-gray-800">
                                    {format(day, "EEE, MMM d")}
                                </h4>
                                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${allReviewed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                    {allReviewed ? "Done" : "Pending"}
                                </span>
                            </div>

                            {dayCommissions.length > 0 && (() => {
                                return (
                                <div className="space-y-1.5">
                                    <p className="text-sm font-semibold text-gray-900">Commission</p>
                                    <div className="bg-slate-100 rounded-xl px-3 py-2 space-y-2">
                                        {dayCommissions.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-700 font-medium">{c.storeName ?? "—"}</p>
                                                    <p className="text-sm font-semibold text-blue-600">
                                                        {c.totalCups} <span className="font-semibold">{t("analytics.cups").toLowerCase()}</span>
                                                        <span className="font-normal text-gray-600 ml-1">× {formatRupiah(c.ratePerCup)}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    {c.status === "rejected" && (
                                                        <p className="text-xs font-medium text-red-500">{t("earnings.statusRejected")}</p>
                                                    )}
                                                    <p className={`font-medium ${c.status === "rejected" ? "text-base text-red-400 line-through" : c.status === "pending" ? "text-xs text-gray-800" : "text-base text-gray-800"}`}>
                                                        {c.status === "pending" ? t("earnings.pendingReview") : formatRupiah(c.totalCommission)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })()}

                            {dayClaims.length > 0 && (() => {
                                return (
                                <div className="space-y-1.5">
                                    <p className="text-sm font-semibold text-gray-900">Claims</p>
                                    <div className="bg-slate-100 rounded-xl px-3 py-2 space-y-2">
                                        {dayClaims.map((c) => (
                                            <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                                                <p className="text-gray-800 font-medium min-w-0 truncate">
                                                    {c.claimTypeName ?? c.claimConfigId ?? "—"}
                                                </p>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {c.status === "rejected" && (
                                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                                            {t("claims.statusRejected")}
                                                        </span>
                                                    )}
                                                    <span className={`font-medium ${c.status === "rejected" ? "text-base text-red-400 line-through" : c.status === "pending" ? "text-xs text-gray-800" : "text-base text-gray-800"}`}>
                                                        {c.status === "pending" ? t("earnings.pendingReview") : formatRupiah(c.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                );
                            })()}

                            <div className="flex items-center justify-between border-t border-gray-100 pt-3 px-1">
                                <span className="text-base font-semibold text-gray-700">{t("manage.total")}</span>
                                <span className="text-base font-bold text-green-600">{formatRupiah(dayApprovedTotal)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
