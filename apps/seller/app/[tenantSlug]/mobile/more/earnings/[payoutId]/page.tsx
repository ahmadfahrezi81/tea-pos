"use client";

import { use } from "react";
import { usePayslip } from "@/lib/hooks/payroll/usePayslip";
import { getExpectedPayoutDate } from "@tea-pos/utils/week";
import CopyableField from "@/components/shared/CopyableField";
import { SummaryPhotoThumbnail } from "@/app/[tenantSlug]/mobile/home/manage/_components/daily/SummaryPhotoThumbnail";
import { parseISO, format, eachDayOfInterval, getISOWeek } from "date-fns";
import { useT } from "@/lib/hooks/useT";
import { formatRupiah } from "@tea-pos/utils/formatCurrency";
import { Skeleton, SkeletonText } from "@tea-pos/ui/custom/Skeleton";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const STATUS_PILL: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
    skipped: "bg-gray-200 text-gray-600",
};

export default function PayslipPage({ params }: { params: Promise<{ payoutId: string }> }) {
    const { payoutId } = use(params);
    const { payslip, isLoading } = usePayslip(payoutId);
    const t = useT();

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-4 space-y-2.5">
                        <Skeleton delay={i * 90} className="h-4 w-28" />
                        <SkeletonText lines={2} delay={i * 90 + 60} />
                    </div>
                ))}
            </div>
        );
    }

    if (!payslip || !("payout" in (payslip as object))) {
        return <p className="text-center text-gray-400 py-10">{t("earnings.periodNotFound")}</p>;
    }

    const ps = payslip as {
        payout: { id: string; startDate: string; endDate: string; status: string; paidAt: string | null; paymentProofUrl: string | null; notes: string | null };
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

    const { payout, commissions, claims, totalPay, ratePerCup, totalOrders, paidByName } = ps;

    const status = payout.status;

    const weekStart = getISOWeek(parseISO(payout.startDate));
    const weekEnd = getISOWeek(parseISO(payout.endDate));
    const sameWeek = weekStart === weekEnd;
    const totalCups = commissions.filter((c) => c.status === "approved").reduce((s, c) => s + c.totalCups, 0);
    const expectedPayoutDate = getExpectedPayoutDate(payout.endDate);

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
                    <h3 className="text-lg font-semibold text-gray-800">
                        {sameWeek
                            ? `${t("earnings.week")} ${weekStart}`
                            : `${t("earnings.week")} ${weekStart} · ${t("earnings.week")} ${weekEnd}`}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-sm font-medium ${STATUS_PILL[status] ?? STATUS_PILL.pending}`}>
                        {status === "pending"
                            ? t("earnings.statusOngoing")
                            : status === "paid"
                                ? t("earnings.statusPaid")
                                : status === "skipped"
                                    ? t("earnings.statusSkipped")
                                    : status}
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
            <section>
                <div className="bg-white p-4 rounded-2xl space-y-2 text-sm">
                    <h3 className="text-sm font-semibold text-gray-800">{t("earnings.paymentDetails")}</h3>
                    {[
                        { label: t("earnings.payrollFrom"), value: format(parseISO(payout.startDate), "EEE, d MMM yyyy") },
                        { label: t("earnings.payrollTo"), value: format(parseISO(payout.endDate), "EEE, d MMM yyyy") },
                        { label: t("earnings.expectedPayout"), value: expectedPayoutDate ? format(parseISO(expectedPayoutDate), "EEE, d MMM yyyy") : "—", valueClass: "font-semibold text-blue-600" },
                        { label: t("earnings.perCupLabel"), value: ratePerCup > 0 ? formatRupiah(ratePerCup) : "—" },
                    ].map(({ label, value, valueClass }) => (
                        <div key={label} className="flex justify-between items-center">
                            <span className="text-gray-500">{label}</span>
                            <span className={valueClass ?? "font-medium text-gray-800"}>{value}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                        <span className="text-gray-500">{t("earnings.payslipId")}</span>
                        <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-gray-400">{payout.id.slice(0, 8)}…</span>
                            <CopyableField label={t("earnings.payslipId")} value={payout.id} />
                        </div>
                    </div>
                    {/* Below the divider with the payslip ID: what the period was is
                        one thing, what actually happened when it was paid is
                        another. The proof and the note continue this group. */}
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">{t("earnings.paidOn")}</span>
                        <span className="font-medium text-gray-800">
                            {payout.paidAt ? format(new Date(payout.paidAt), "d MMM yyyy") : "—"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">{t("earnings.paidBy")}</span>
                        <span className="font-medium text-gray-800">{paidByName ?? "—"}</span>
                    </div>
                    {/* The receipt and the note are one piece of evidence —
                        what was sent and what was said about it — so they share
                        a label and sit side by side. The thumbnail is the
                        component the day-events timeline uses, so tapping a
                        photo opens the same full-screen viewer everywhere. */}
                    {(payout.paymentProofUrl || payout.notes) && (
                        <div className="pt-2.5 border-t border-gray-100 space-y-1.5">
                            <p className="text-gray-500">{t("earnings.receiptAndNote")}</p>
                            <div className="flex gap-2.5">
                                {payout.paymentProofUrl && (
                                    <SummaryPhotoThumbnail
                                        url={payout.paymentProofUrl}
                                        alt={t("earnings.transferProof")}
                                        className="w-20 h-20 shrink-0"
                                        isSaved={false}
                                    />
                                )}
                                {payout.notes && (
                                    <p className="flex-1 min-w-0 text-sm text-gray-800 whitespace-pre-wrap bg-slate-50 rounded-xl p-3">{payout.notes}</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Calendar — titled like the Work Days section on the More screen,
                so the same grid reads the same way in both places. */}
            <section>
                <div className="bg-white rounded-2xl px-3 py-3 space-y-1.5">
                    <h3 className="text-sm font-semibold text-gray-800">{t("more.workDays")}</h3>
                    <div className="grid grid-cols-7 gap-1.5 mb-1">
                        {WEEKDAY_KEYS.map((d) => (
                            <span key={d} className="text-xs font-semibold text-gray-500 text-center">{t(`common.weekdays.${d}`)}</span>
                        ))}
                    </div>
                    {[week1, week2].filter((w) => w.length > 0).map((week, wi) => (
                        <div key={wi} className="grid grid-cols-7 gap-1.5 items-center">
                            {week.map((day) => {
                                const dateKey = format(day, "yyyy-MM-dd");
                                const worked = commissionDates.has(dateKey);
                                return (
                                    <div
                                        key={dateKey}
                                        className={`w-9 h-9 mx-auto flex items-center justify-center rounded-lg text-sm font-medium ${
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
            </section>

            {/* Per-day cards */}
            <section className="space-y-2">
                <p className="pl-3 text-lg font-semibold text-gray-800">{t("earnings.dailyBreakdown")}</p>
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
                                {/* Date and its review state read as one unit on the
                                    left; the day's total is the number the eye is
                                    looking for, so it sits alone on the right. */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <h4 className="text-base font-bold text-gray-800 shrink-0">
                                            {format(day, "EEE, MMM d")}
                                        </h4>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${allReviewed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                            {allReviewed ? t("earnings.statusDone") : t("claims.statusPending")}
                                        </span>
                                    </div>
                                    <span className="text-base font-bold text-green-600 shrink-0">{formatRupiah(dayApprovedTotal)}</span>
                                </div>

                                {dayCommissions.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-gray-900">{t("earnings.commissionsRow")}</p>
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
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {c.status === "rejected" && (
                                                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                                                                {t("claims.statusRejected")}
                                                            </span>
                                                        )}
                                                        <span className={`font-medium ${c.status === "rejected" ? "text-base text-red-400 line-through" : c.status === "pending" ? "text-xs text-gray-800" : "text-base text-gray-800"}`}>
                                                            {c.status === "pending" ? t("earnings.pendingReview") : formatRupiah(c.totalCommission)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dayClaims.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-gray-900">{t("earnings.claimsRow")}</p>
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
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

        </div>
    );
}
