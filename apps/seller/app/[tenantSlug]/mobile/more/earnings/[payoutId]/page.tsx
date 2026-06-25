"use client";

import { use, useState } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayslip";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { parseISO, format, eachDayOfInterval, getISOWeek } from "date-fns";
import Image from "next/image";
import { useT } from "@/lib/hooks/useT";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_PILL: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
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
        commissions: Array<{ date: string; totalCups: number; totalCommission: number; ratePerCup: number; storeName?: string | null }>;
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
    };

    const { payout, commissions, claims, commissionsTotal, claimsTotal, totalPay, ratePerCup } = ps;

    const status = payout.status;
    const hasBankInfo = payrollInfo?.bankName || payrollInfo?.bankAccountNumber;

    const weekStart = getISOWeek(parseISO(payout.startDate));
    const weekEnd = getISOWeek(parseISO(payout.endDate));
    const totalCups = commissions.reduce((s, c) => s + c.totalCups, 0);

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
                        W{weekStart} · W{weekEnd}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>
                        {status === "pending" ? t("earnings.statusWaiting") : status === "paid" ? t("earnings.statusPaid") : status}
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                        <p className="text-xl font-bold text-orange-600">{totalCups}</p>
                        <p className="text-sm text-gray-600">{t("analytics.cups")}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">
                            Rp {ratePerCup.toLocaleString("id-ID")}
                        </p>
                        <p className="text-sm text-gray-600">{t("earnings.perCup")}</p>
                    </div>
                    <div className="text-center col-span-2 border-l-2 border-gray-300">
                        <p className="text-sm text-gray-600">{t("earnings.totalRow")}</p>
                        <p className="text-xl font-bold text-green-600">{formatRupiah(totalPay)}</p>
                        {claimsTotal > 0 && (
                            <p className="text-xs text-gray-400">
                                {formatRupiah(commissionsTotal)} + {formatRupiah(claimsTotal)}
                            </p>
                        )}
                    </div>
                </div>
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
                    const dayTotalCups = dayCommissions.reduce((s, c) => s + c.totalCups, 0);
                    const dayGrossPay = dayCommissions.reduce((s, c) => s + c.totalCommission, 0);
                    const day = parseISO(dateStr);

                    return (
                        <div key={dateStr} className="bg-white rounded-2xl overflow-hidden">
                            <div className="p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xl font-bold text-gray-800">
                                        {format(day, "EEE, MMM d")}
                                    </h4>
                                    {dayTotalCups > 0 && (
                                        <span className="text-sm font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-lg">
                                            {dayTotalCups} {t("analytics.cups")}
                                        </span>
                                    )}
                                </div>

                                {dayCommissions.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 rounded-2xl p-2 bg-slate-100 text-gray-800">
                                        {dayCommissions.map((c, i) => (
                                            <div key={i}>
                                                <p className="text-xs">{c.storeName ?? "—"}</p>
                                                <p className="text-lg font-extrabold text-green-600">
                                                    {formatRupiah(c.totalCommission)}
                                                </p>
                                            </div>
                                        ))}
                                        {dayCommissions.length > 1 && (
                                            <>
                                                <hr className="col-span-2 border-gray-300" />
                                                <div className="col-span-2 flex justify-between font-extrabold">
                                                    <span>{t("manage.total")}</span>
                                                    <span className="text-green-600">{formatRupiah(dayGrossPay)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {dayClaims.length > 0 && (
                                    <div className="bg-blue-50 rounded-xl p-2 space-y-1">
                                        {dayClaims.map((c) => (
                                            <div key={c.id} className="flex justify-between items-center text-sm">
                                                <span className="text-blue-800 font-medium">
                                                    {c.claimTypeName ?? c.claimConfigId ?? "—"}
                                                </span>
                                                <span className={`font-bold ${c.status === "approved" ? "text-blue-700" : c.status === "rejected" ? "text-red-500" : "text-gray-400"}`}>
                                                    {c.status === "approved"
                                                        ? formatRupiah(c.amount)
                                                        : c.status === "rejected"
                                                        ? t("earnings.statusRejected")
                                                        : t("earnings.pendingReview")}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Payment status */}
            <div className="bg-white rounded-2xl p-4 text-center space-y-2">
                <p className={`text-sm font-bold tracking-wide ${status === "paid" ? "text-green-600" : "text-gray-500"}`}>
                    {status === "pending" ? t("earnings.statusWaitingLong") : status === "paid" ? t("earnings.statusPaidLong") : status.toUpperCase()}
                </p>
                {status === "paid" && payout.paidAt && (
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
                        {payout.paymentProofUrl && (
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
                    <p className="text-xs text-amber-600">{t("earnings.addBankDetails")}</p>
                )}
            </div>
        </div>
    );
}
