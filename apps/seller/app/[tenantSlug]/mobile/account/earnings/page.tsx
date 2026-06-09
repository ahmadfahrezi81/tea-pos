"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { usePayrollPeriods } from "@/lib/hooks/payroll/usePayroll";
import { usePayouts } from "@/lib/hooks/payroll/usePayouts";
import { usePayrollUserInfo } from "@/lib/hooks/payroll-user-info/usePayrollUserInfo";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { getISOWeek, parseISO, format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { PayrollPeriodResponse } from "@tea-pos/features/payroll/schema";

function formatDateRange(startDate: string, endDate: string) {
    return `${format(parseISO(startDate), "MMM d")}–${format(parseISO(endDate), "MMM d")}`;
}

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    approved: "bg-blue-100 text-blue-700",
    on_hold: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Waiting",
    approved: "Ready",
    on_hold: "Being reviewed",
    paid: "Paid ✓",
};

export default function EarningsPage() {
    const { user } = useAuth();
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { payouts, isLoading: payoutsLoading } = usePayouts(user?.id ? { userId: user.id } : undefined);
    const { info, isLoading: infoLoading } = usePayrollUserInfo();

    const isLoading = periodsLoading || payoutsLoading || infoLoading;

    const payoutByPeriod = payouts.reduce<Record<string, typeof payouts[0]>>((acc, p) => {
        acc[p.payrollPeriodId] = p;
        return acc;
    }, {});

    return (
        <div className="space-y-3">
            {/* Rate card */}
            <div className="bg-white rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-0.5">Your rate</p>
                {infoLoading ? (
                    <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                ) : !info || info.ratePerCup === 0 ? (
                    <p className="text-base font-medium text-amber-600">No rate configured — contact admin</p>
                ) : (
                    <p className="text-xl font-bold text-gray-900">
                        Rp {info.ratePerCup.toLocaleString("id-ID")} / cup
                    </p>
                )}
            </div>

            {/* Period list */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse" />)}
                </div>
            ) : periods.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-base">No pay periods yet.</p>
            ) : (
                <div className="space-y-2">
                    {(periods as PayrollPeriodResponse[]).map((period) => {
                        const payout = payoutByPeriod[period.id];
                        const status = payout?.status ?? "pending";
                        const weekNum = getISOWeek(parseISO(period.startDate));

                        return (
                            <button
                                key={period.id}
                                onClick={() =>
                                    navigation.push(url(`/mobile/account/earnings/${period.id}`))
                                }
                                className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-base font-semibold text-gray-900">
                                            Week {weekNum} ·{" "}
                                            {formatDateRange(period.startDate, period.endDate)}
                                        </span>
                                        <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}
                                        >
                                            {STATUS_LABEL[status] ?? status}
                                            {status === "paid" && payout?.paidAt
                                                ? ` · ${format(new Date(payout.paidAt), "d MMM")}`
                                                : ""}
                                        </span>
                                    </div>
                                    {payout ? (
                                        <p className="text-sm text-gray-500">
                                            Rp {payout.totalPay.toLocaleString("id-ID")}
                                            {payout.claimsTotal > 0 && (
                                                <span className="text-gray-400">
                                                    {" · "}
                                                    Rp {payout.commissionsTotal.toLocaleString("id-ID")}{" "}
                                                    commissions + Rp{" "}
                                                    {payout.claimsTotal.toLocaleString("id-ID")} claims
                                                </span>
                                            )}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-400">Tap to view details</p>
                                    )}
                                </div>
                                <ChevronRight size={18} className="text-gray-400 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
