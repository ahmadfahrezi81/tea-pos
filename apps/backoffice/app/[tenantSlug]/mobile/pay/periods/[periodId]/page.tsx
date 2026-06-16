"use client";

import { use } from "react";
import { usePayrollPeriods, usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantUsers } from "@/lib/hooks/users/useTenantUsers";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { ChevronRight } from "lucide-react";
import { getISOWeek, parseISO, format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
    pending: "bg-gray-100 text-gray-500",
    paid: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
    pending: "Pending",
    paid: "Paid ✓",
};

export default function PeriodStaffPage({ params }: { params: Promise<{ periodId: string }> }) {
    const { periodId } = use(params);
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { payouts, isLoading: payoutsLoading } = usePayouts({ periodId });
    const { users, isLoading: usersLoading } = useTenantUsers();

    const isLoading = periodsLoading || payoutsLoading || usersLoading;
    const period = periods.find((p) => p.id === periodId);
    const payoutByUser = payouts.reduce<Record<string, typeof payouts[0]>>((acc, p) => { acc[p.userId] = p; return acc; }, {});
    const staffWithPayouts = users.filter((u) => payoutByUser[u.id]);
    const staffWithoutPayouts = users.filter((u) => !payoutByUser[u.id] && u.role !== "ADMIN");

    if (isLoading) {
        return <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse" />)}</div>;
    }

    return (
        <div className="space-y-3">
            {period && (
                <div className="bg-white rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-500">
                        Week {getISOWeek(parseISO(period.startDate))} · {format(parseISO(period.startDate), "MMM d")}–{format(parseISO(period.endDate), "MMM d, yyyy")}
                    </p>
                </div>
            )}

            {staffWithPayouts.length === 0 && staffWithoutPayouts.length === 0 ? (
                <p className="text-center text-gray-400 py-10">No staff found.</p>
            ) : (
                <div className="space-y-2">
                    {staffWithPayouts.map((user) => {
                        const payout = payoutByUser[user.id]!;
                        return (
                            <button
                                key={user.id}
                                onClick={() => navigation.push(url(`/mobile/pay/periods/${periodId}/${user.id}`))}
                                className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-base font-semibold text-gray-900">{user.fullName}</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[payout.status] ?? STATUS_STYLE.pending}`}>
                                            {STATUS_LABEL[payout.status] ?? payout.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">Rp {payout.totalPay.toLocaleString("id-ID")}</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-400 shrink-0" />
                            </button>
                        );
                    })}
                    {staffWithoutPayouts.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => navigation.push(url(`/mobile/pay/periods/${periodId}/${user.id}`))}
                            className="w-full bg-white rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
                        >
                            <div className="flex-1 min-w-0">
                                <span className="text-base font-semibold text-gray-900">{user.fullName}</span>
                                <p className="text-sm text-gray-400">No payout yet — tap to review</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-400 shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
