"use client";

import { usePayrollPeriods, usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { getISOWeek, parseISO, format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { PayrollPeriodResponse } from "@tea-pos/features/payroll/schema";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    approved: "bg-blue-100 text-blue-700",
    on_hold: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    on_hold: "On Hold",
    paid: "Paid",
};

export default function StaffPayPeriodsPage() {
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { payouts, isLoading: payoutsLoading } = usePayouts();
    const isLoading = periodsLoading || payoutsLoading;

    const payoutsByPeriod = payouts.reduce<Record<string, typeof payouts>>((acc, p) => {
        if (!acc[p.payrollPeriodId]) acc[p.payrollPeriodId] = [];
        acc[p.payrollPeriodId].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-2">
            {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />)
            ) : periods.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No pay periods yet.</p>
            ) : (
                (periods as PayrollPeriodResponse[]).map((period) => {
                    const periodPayouts = payoutsByPeriod[period.id] ?? [];
                    const staffCount = periodPayouts.length;
                    const totalPay = periodPayouts.reduce((s, p) => s + p.totalPay, 0);
                    const weekNum = getISOWeek(parseISO(period.startDate));
                    const pendingCount = periodPayouts.filter(p => p.status === "pending").length;

                    return (
                        <button
                            key={period.id}
                            onClick={() => navigation.push(url(`/mobile/pay/periods/${period.id}`))}
                            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base font-semibold text-gray-900">
                                        Week {weekNum} · {format(parseISO(period.startDate), "MMM d")}–{format(parseISO(period.endDate), "MMM d")}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {staffCount > 0
                                        ? `${staffCount} staff · Rp ${totalPay.toLocaleString("id-ID")}${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`
                                        : "No payouts yet"}
                                </p>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    );
                })
            )}
        </div>
    );
}
