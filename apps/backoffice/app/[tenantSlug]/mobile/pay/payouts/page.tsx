"use client";

import { useState } from "react";
import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek, startOfMonth, endOfMonth } from "date-fns";
import { UserCircle, ArrowUpRight, CalendarDays } from "lucide-react";
import Image from "next/image";
import { getCurrentLocalMonth } from "@tea-pos/utils/time";
import type { PayoutResponse } from "@tea-pos/features/payroll/schema";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};

export default function StaffPayoutsPage() {
    const { url } = useTenantSlug();
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentLocalMonth());

    const { payouts, isLoading } = usePayouts();
    const { users } = useTenantUsers();

    const userById = Object.fromEntries(users.map((u) => [u.id, u]));
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);

    const filtered = payouts.filter((p) => {
        const start = parseISO(p.startDate);
        const end = parseISO(p.endDate);
        return start <= monthEnd && end >= monthStart;
    });

    const pending = filtered.filter((p) => p.status === "pending").sort((a, b) => (b.pendingCount ?? 0) - (a.pendingCount ?? 0) || b.startDate.localeCompare(a.startDate));
    const done = filtered.filter((p) => p.status !== "pending").sort((a, b) => b.startDate.localeCompare(a.startDate));

    function renderCard(payout: PayoutResponse) {
        const user = userById[payout.userId];
        const weekStart = getISOWeek(parseISO(payout.startDate));
        const weekEnd = getISOWeek(parseISO(payout.endDate));
        const sameWeek = weekStart === weekEnd;

        return (
            <button
                key={payout.id}
                onClick={() => navigation.push(url(`/mobile/pay/payouts/${payout.id}?userId=${payout.userId}`))}
                className="w-full bg-white rounded-2xl p-4 text-left active:bg-gray-50 space-y-3"
            >
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
                        <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLE[payout.status] ?? STATUS_STYLE.pending}`}>
                            {payout.status === "pending" ? "Ongoing" : `Paid${payout.paidAt ? ` · ${format(new Date(payout.paidAt), "d MMM")}` : ""}`}
                        </span>
                        <ArrowUpRight size={18} className="text-gray-400" />
                    </div>
                </div>

                {/* User profile */}
                <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1.5 w-full">
                    {user?.avatarUrl ? (
                        <Image src={user.avatarUrl} alt={user.fullName ?? ""} width={28} height={28} className="rounded-lg object-cover shrink-0" />
                    ) : (
                        <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                            <UserCircle size={18} className="text-brand" />
                        </div>
                    )}
                    <p className="text-base font-bold text-gray-900 truncate flex-1">{user?.fullName ?? "Unknown"}</p>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Orders</p>
                        <p className="text-xl font-bold text-orange-900">{payout.totalOrders}</p>
                    </div>
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <p className="text-xs font-semibold text-gray-700">Cups</p>
                        <p className="text-xl font-bold text-blue-900">{payout.totalCups}</p>
                    </div>
                    <div className="bg-green-100 p-2 rounded-lg col-span-2">
                        <p className="text-xs font-semibold text-gray-700">Total Pay</p>
                        <p className="text-xl font-bold text-green-900">Rp {payout.totalPay.toLocaleString("id-ID")}</p>
                    </div>
                    <div className="col-span-4 grid grid-cols-2 gap-2">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Pending</p>
                            <p className="text-xl font-bold text-yellow-900">{payout.pendingCount ?? 0}</p>
                        </div>
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Approved</p>
                            <p className="text-xl font-bold text-purple-900">{payout.approvedCount ?? 0}</p>
                        </div>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="space-y-3">
            <div className="bg-white p-4 rounded-2xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays size={16} className="inline mr-1" />
                    Select Month
                </label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/90 focus:outline-none"
                />
            </div>


            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl p-4 h-40 animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No payouts for this period.</p>
            ) : (
                <div className="space-y-2">
                    {pending.map(renderCard)}
                    {pending.length > 0 && done.length > 0 && (
                        <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Done</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                    )}
                    {done.map(renderCard)}
                </div>
            )}
        </div>
    );
}
