"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePayrollPeriods, usePayrollCommissions } from "@/lib/hooks/payroll/usePayroll";
import { usePayouts } from "@/lib/hooks/payroll/usePayouts";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { getISOWeek, parseISO, format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { PayrollPeriodResponse, PayoutResponse } from "@tea-pos/features/payroll/schema";
import { useT } from "@/lib/hooks/useT";
import { getWeekInfo } from "@tea-pos/utils/week";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { EarningsViewSwitcher, type EarningsView } from "./_components/EarningsViewSwitcher";
import { PayConfigCard } from "./_components/PayConfigCard";
import { PayCalendar } from "./_components/PayCalendar";
import { MonthSelector } from "./_components/MonthSelector";

function formatDateRange(startDate: string, endDate: string) {
    return `${format(parseISO(startDate), "MMM d")}–${format(parseISO(endDate), "MMM d")}`;
}

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    approved: "bg-blue-100 text-blue-700",
    on_hold: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
};

function periodOverlapsMonth(period: PayrollPeriodResponse, month: Date) {
    const ym = format(month, "yyyy-MM");
    return format(parseISO(period.startDate), "yyyy-MM") === ym || format(parseISO(period.endDate), "yyyy-MM") === ym;
}

export default function EarningsPage() {
    const { user } = useAuth();
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { payouts, isLoading: payoutsLoading } = usePayouts(user?.id ? { userId: user.id } : undefined);
    const { commissions, isLoading: commissionsLoading } = usePayrollCommissions(
        user?.id ? { userId: user.id } : undefined,
    );
    const t = useT();

    const [view, setView] = useState<EarningsView>("calendar");
    const [month, setMonth] = useState(() => new Date());

    const payoutByPeriod = payouts.reduce<Record<string, PayoutResponse>>((acc, p) => {
        acc[p.payrollPeriodId] = p;
        return acc;
    }, {});

    const cupsByPeriod = useMemo(() => {
        return commissions.reduce<Record<string, number>>((acc, c) => {
            acc[c.payrollPeriodId] = (acc[c.payrollPeriodId] ?? 0) + c.totalCups;
            return acc;
        }, {});
    }, [commissions]);

    const grossPayByPeriod = useMemo(() => {
        return commissions.reduce<Record<string, number>>((acc, c) => {
            acc[c.payrollPeriodId] = (acc[c.payrollPeriodId] ?? 0) + c.grossPay;
            return acc;
        }, {});
    }, [commissions]);

    const periodsInMonth = useMemo(
        () => (periods as PayrollPeriodResponse[]).filter((p) => periodOverlapsMonth(p, month)),
        [periods, month],
    );

    const monthTotal = useMemo(
        () => periodsInMonth.reduce((sum, p) => sum + (payoutByPeriod[p.id]?.totalPay ?? 0), 0),
        [periodsInMonth, payoutByPeriod],
    );

    const isLoading = periodsLoading || payoutsLoading || commissionsLoading;

    function renderPeriodRow(period: PayrollPeriodResponse) {
        const payout = payoutByPeriod[period.id];
        const status = payout?.status ?? "pending";
        const weekNum = getISOWeek(parseISO(period.startDate));
        const cups = cupsByPeriod[period.id] ?? 0;
        const grossPay = grossPayByPeriod[period.id] ?? 0;

        return (
            <button
                key={period.id}
                onClick={() => navigation.push(url(`/mobile/more/earnings/${period.id}`))}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base font-semibold text-gray-900">
                            Week {weekNum} · {formatDateRange(period.startDate, period.endDate)}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
                            {status === "pending" ? t("earnings.statusWaiting") : status === "approved" ? t("earnings.statusReady") : status === "on_hold" ? t("earnings.statusReview") : status === "paid" ? t("earnings.statusPaid") : status}
                            {status === "paid" && payout?.paidAt ? ` · ${format(new Date(payout.paidAt), "d MMM")}` : ""}
                        </span>
                    </div>
                    {payout ? (
                        <p className="text-sm text-gray-500">
                            {cups > 0 && `${cups} ${t("earnings.cups")} · `}
                            Rp {payout.totalPay.toLocaleString("id-ID")}
                            {payout.claimsTotal > 0 && (
                                <span className="text-gray-400">
                                    {" · "}
                                    Rp {payout.commissionsTotal.toLocaleString("id-ID")} {t("earnings.commissionsLabel")} + Rp {payout.claimsTotal.toLocaleString("id-ID")} {t("earnings.claimsLabel")}
                                </span>
                            )}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-400">
                            {cups} {t("earnings.cups")} · Rp {grossPay.toLocaleString("id-ID")}
                        </p>
                    )}
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xl font-bold text-gray-900 tracking-tight">
                        {format(new Date(), "MMMM yyyy")}
                    </p>
                    <p className="text-base text-gray-600">
                        {getWeekInfo().label} · {format(new Date(), "EEE d")}
                    </p>
                </div>
                <EarningsViewSwitcher view={view} onChange={setView} />
            </div>

            {view === "config" ? (
                <PayConfigCard />
            ) : (
                <>
                    <PayCalendar month={month} commissions={commissions} periods={periods} isLoading={isLoading} />

                    <MonthSelector month={month} onChange={setMonth} />

                    {isLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <SkeletonValue key={i} loading className="h-16 w-full rounded-xl">{null}</SkeletonValue>
                            ))}
                        </div>
                    ) : periodsInMonth.length === 0 ? (
                        <p className="text-center text-gray-400 py-10 text-base">{t("earnings.noPeriods")}</p>
                    ) : (
                        <div className="space-y-2">
                            {monthTotal > 0 && (
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {format(month, "MMMM yyyy")}
                                    </p>
                                    <p className="text-xs font-semibold text-gray-500">
                                        Rp {monthTotal.toLocaleString("id-ID")}
                                    </p>
                                </div>
                            )}
                            {periodsInMonth.map(renderPeriodRow)}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
