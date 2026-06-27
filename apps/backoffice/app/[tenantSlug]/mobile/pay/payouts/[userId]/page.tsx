"use client";

import { use } from "react";
import { usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { parseISO, format, getISOWeek } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import type { PayoutResponse } from "@tea-pos/features/payroll/schema";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-green-100 text-green-700",
};

export default function UserPayoutsPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { url } = useTenantSlug();
    const { payouts, isLoading } = usePayouts({ userId });
    const { users } = useTenantUsers();

    const user = users.find((u) => u.id === userId);

    function renderCard(payout: PayoutResponse) {
        const weekStart = getISOWeek(parseISO(payout.startDate));
        const weekEnd = getISOWeek(parseISO(payout.endDate));
        const sameWeek = weekStart === weekEnd;

        return (
            <button
                key={payout.id}
                onClick={() => navigation.push(url(`/mobile/pay/payouts/${userId}/${payout.id}`))}
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
                    <div className="col-span-4 grid grid-cols-3 gap-2">
                        <div className="bg-slate-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Claims</p>
                            <p className="text-xl font-bold text-gray-800">{payout.totalClaims ?? 0}</p>
                        </div>
                        <div className="bg-yellow-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Pending</p>
                            <p className="text-xl font-bold text-yellow-900">{payout.pendingCount ?? 0}</p>
                        </div>
                        <div className="bg-green-100 p-2 rounded-lg">
                            <p className="text-xs font-semibold text-gray-700">Approved</p>
                            <p className="text-xl font-bold text-green-900">{payout.approvedCount ?? 0}</p>
                        </div>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <div className="space-y-3">
            {user && (
                <div className="bg-white rounded-xl px-4 py-3">
                    <p className="text-base font-semibold text-gray-900">{user.fullName}</p>
                    <p className="text-sm text-gray-400">{user.role}</p>
                </div>
            )}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl p-4 h-40 animate-pulse" />)}
                </div>
            ) : payouts.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No payouts yet.</p>
            ) : (
                <div className="space-y-2">{payouts.map(renderCard)}</div>
            )}
        </div>
    );
}
