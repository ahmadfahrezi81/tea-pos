"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePayouts } from "@/lib/hooks/payroll/usePayouts";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek } from "date-fns";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { PayoutResponse } from "@tea-pos/features/payroll/schema";
import { useT } from "@/lib/hooks/useT";
import { SkeletonValue } from "@/components/shared/SkeletonValue";
import { PayConfigCard } from "./_components/PayConfigCard";
import { toIndonesiaMonthYear } from "@tea-pos/utils/server-config/timezone";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
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
                className="w-full bg-white rounded-2xl p-4 text-left active:bg-gray-50 space-y-3"
            >
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-900">
                            {sameWeek ? `Week ${weekStart}` : `Week ${weekStart} · Week ${weekEnd}`}
                        </p>
                        <p className="text-sm text-gray-500">
                            {format(parseISO(payout.startDate), "EEE, d MMM")} – {format(parseISO(payout.endDate), "EEE, d MMM")}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
                            {status === "pending" ? "Ongoing" : status === "paid" ? t("earnings.statusPaid") : status}
                            {status === "paid" && payout.paidAt ? ` · ${format(new Date(payout.paidAt), "d MMM")}` : ""}
                        </span>
                        <ArrowUpRight size={18} className="text-gray-400" />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-50 rounded-2xl px-3 py-3 text-center">
                        <p className="text-xl font-bold text-orange-600">{payout.totalOrders}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t("analytics.orders")}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl px-3 py-3 text-center">
                        <p className="text-xl font-bold text-blue-600">{payout.totalCups}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t("earnings.cups")}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl px-3 py-3 text-center col-span-2">
                        <p className="text-xl font-bold text-green-600">{`Rp ${payout.totalPay.toLocaleString("id-ID")}`}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t("earnings.totalRow")}</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl px-3 py-3 text-center">
                        <p className="text-xl font-bold text-gray-700">{payout.totalClaims ?? 0}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Claims</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl px-3 py-3 text-center">
                        <p className="text-xl font-bold text-green-700">{payout.approvedCount ?? 0}</p>
                        <p className="text-xs text-green-600 mt-0.5">Approved</p>
                    </div>
                    <div className="bg-yellow-50 rounded-2xl px-3 py-3 text-center col-span-2">
                        <p className="text-xl font-bold text-yellow-700">{payout.pendingCount ?? 0}</p>
                        <p className="text-xs text-yellow-600 mt-0.5">Pending Review</p>
                    </div>
                </div>
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
                        return (
                            <div key={monthKey} className="space-y-2">
                                <div className="px-1">
                                    <p className="text-lg font-semibold text-gray-800">
                                        {toIndonesiaMonthYear(monthKey)}
                                    </p>
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
