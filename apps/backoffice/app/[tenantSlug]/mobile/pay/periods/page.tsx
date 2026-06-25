"use client";

import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { getISOWeek, parseISO, format } from "date-fns";
import { ChevronRight } from "lucide-react";

export default function StaffPayPeriodsPage() {
    const { url } = useTenantSlug();
    const { payouts, isLoading } = usePayouts();

    // Group payouts by unique startDate (each startDate represents a pay window)
    const windowMap = new Map<string, typeof payouts>();
    for (const payout of payouts) {
        const existing = windowMap.get(payout.startDate) ?? [];
        windowMap.set(payout.startDate, [...existing, payout]);
    }
    const windows = [...windowMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));

    return (
        <div className="space-y-2">
            {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />)
            ) : windows.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No pay periods yet.</p>
            ) : (
                windows.map(([startDate, windowPayouts]) => {
                    const endDate = windowPayouts[0].endDate;
                    const staffCount = windowPayouts.length;
                    const totalPay = windowPayouts.reduce((s, p) => s + p.totalPay, 0);
                    const weekStart = getISOWeek(parseISO(startDate));
                    const weekEnd = getISOWeek(parseISO(endDate));
                    const pendingCount = windowPayouts.filter((p) => p.status === "pending").length;
                    const sameWeek = weekStart === weekEnd;

                    return (
                        <button
                            key={startDate}
                            onClick={() => navigation.push(url(`/mobile/pay/periods/${startDate}`))}
                            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base font-semibold text-gray-900">
                                        {sameWeek ? `W${weekStart}` : `W${weekStart}–W${weekEnd}`} · {format(parseISO(startDate), "MMM d")}–{format(parseISO(endDate), "MMM d")}
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
