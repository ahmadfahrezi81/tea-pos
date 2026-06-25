"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePayouts } from "@/lib/hooks/payroll/usePayouts";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek } from "date-fns";
import { ChevronRight, CalendarDays } from "lucide-react";
import type { PayoutResponse } from "@tea-pos/features/payroll/schema";
import { useT } from "@/lib/hooks/useT";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { PayConfigCard } from "./_components/PayConfigCard";
import { toIndonesiaMonthYear } from "@tea-pos/utils/server-config/timezone";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    paid: "bg-green-100 text-green-700",
};

export default function EarningsPage() {
    const { user } = useAuth();
    const { url } = useTenantSlug();
    const { payouts, isLoading } = usePayouts(user?.id ? { userId: user.id } : undefined);
    const t = useT();

    const availableYears = useMemo(() => {
        const years = [...new Set(
            payouts.map((p) => parseISO(p.startDate).getFullYear())
        )].sort((a, b) => b - a);
        if (years.length === 0) years.push(new Date().getFullYear());
        return years;
    }, [payouts]);

    const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

    const groupedByMonth = useMemo(() => {
        const filtered = payouts
            .filter((p) => parseISO(p.startDate).getFullYear() === selectedYear)
            .sort((a, b) => b.startDate.localeCompare(a.startDate));

        const groups: Record<string, PayoutResponse[]> = {};
        for (const p of filtered) {
            const key = format(parseISO(p.startDate), "yyyy-MM");
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        }
        return groups;
    }, [payouts, selectedYear]);

    const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

    function renderPayoutRow(payout: PayoutResponse) {
        const status = payout.status;
        const weekStart = getISOWeek(parseISO(payout.startDate));
        const weekEnd = getISOWeek(parseISO(payout.endDate));
        const sameWeek = weekStart === weekEnd;

        return (
            <button
                key={payout.id}
                onClick={() => navigation.push(url(`/mobile/more/earnings/${payout.id}`))}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base font-semibold text-gray-900">
                            {sameWeek ? `W${weekStart}` : `W${weekStart} · W${weekEnd}`}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
                            {status === "pending" ? t("earnings.statusWaiting") : status === "paid" ? t("earnings.statusPaid") : status}
                            {status === "paid" && payout.paidAt ? ` · ${format(new Date(payout.paidAt), "d MMM")}` : ""}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        {format(parseISO(payout.startDate), "MMM d")}–{format(parseISO(payout.endDate), "MMM d")}
                        {payout.totalCups > 0 && ` · ${payout.totalCups} ${t("earnings.cups")}`}
                        {` · Rp ${payout.totalPay.toLocaleString("id-ID")}`}
                    </p>
                </div>
                <ChevronRight size={18} className="text-gray-400 shrink-0" />
            </button>
        );
    }

    return (
        <div className="space-y-4">
            <PayConfigCard />

            {/* Year Selector */}
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    {t("earnings.selectYear")}
                </label>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none bg-white text-gray-800"
                >
                    {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <SkeletonValue key={i} loading className="h-16 w-full rounded-xl">{null}</SkeletonValue>
                    ))}
                </div>
            ) : monthKeys.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-base">{t("earnings.noPeriods")}</p>
            ) : (
                <div className="space-y-4">
                    {monthKeys.map((monthKey) => {
                        const monthPayouts = groupedByMonth[monthKey];
                        const monthTotal = monthPayouts.reduce((sum, p) => sum + p.totalPay, 0);
                        return (
                            <div key={monthKey} className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-sm font-semibold text-gray-500">
                                        {toIndonesiaMonthYear(monthKey)}
                                    </p>
                                    {monthTotal > 0 && (
                                        <p className="text-sm font-semibold text-gray-500">
                                            Rp {monthTotal.toLocaleString("id-ID")}
                                        </p>
                                    )}
                                </div>
                                {monthPayouts.map(renderPayoutRow)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
