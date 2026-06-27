"use client";

import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek } from "date-fns";
import { ChevronRight } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};

export default function StaffPayoutsPage() {
    const { url } = useTenantSlug();
    const { payouts, isLoading: payoutsLoading } = usePayouts();
    const { users, isLoading: usersLoading } = useTenantUsers();

    const isLoading = payoutsLoading || usersLoading;

    // Latest payout per user
    const latestByUser = new Map<string, typeof payouts[0]>();
    for (const p of payouts) {
        const existing = latestByUser.get(p.userId);
        if (!existing || p.startDate > existing.startDate) {
            latestByUser.set(p.userId, p);
        }
    }

    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    const rows = [...latestByUser.entries()]
        .map(([userId, payout]) => ({ userId, payout, user: userById[userId] }))
        .filter((r) => r.user)
        .sort((a, b) => {
            if (a.payout.status === b.payout.status) return b.payout.startDate.localeCompare(a.payout.startDate);
            return a.payout.status === "pending" ? -1 : 1;
        });

    return (
        <div className="space-y-2">
            {isLoading ? (
                [1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse" />)
            ) : rows.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No payouts yet.</p>
            ) : (
                <div className="bg-white rounded-xl divide-y divide-gray-100">
                    {rows.map(({ userId, payout, user }) => {
                        const week = getISOWeek(parseISO(payout.startDate));
                        const dateRange = `${format(parseISO(payout.startDate), "d MMM")}–${format(parseISO(payout.endDate), "d MMM")}`;
                        return (
                            <button
                                key={userId}
                                onClick={() => navigation.push(url(`/mobile/pay/payouts/${userId}`))}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-semibold text-gray-900 truncate">{user.fullName}</p>
                                    <p className="text-sm text-gray-400">
                                        Week {week} · {dateRange} · Rp {payout.totalPay.toLocaleString("id-ID")}
                                    </p>
                                </div>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[payout.status] ?? STATUS_STYLE.pending}`}>
                                    {payout.status === "pending" ? "Ongoing" : "Paid"}
                                </span>
                                <ChevronRight size={18} className="text-gray-400 shrink-0" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
