"use client";

import { usePayrollPeriods, usePayouts } from "@/lib/hooks/payroll/usePayroll";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { ChevronRight, Users, ReceiptText, Tag, Award, UserCog } from "lucide-react";
import { getISOWeek, format, startOfISOWeek, endOfISOWeek } from "date-fns";

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="w-full flex items-center gap-3 py-4 border-b border-gray-100 last:border-none active:bg-gray-50 text-left">
            <span className="text-gray-600">{icon}</span>
            <span className="flex-1 text-base font-medium text-gray-800">{label}</span>
            <ChevronRight size={18} className="text-gray-400" />
        </button>
    );
}

export default function PayOverviewPage() {
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { payouts, isLoading: payoutsLoading } = usePayouts();
    const isLoading = periodsLoading || payoutsLoading;

    const today = new Date();
    const weekStart = format(startOfISOWeek(today), "yyyy-MM-dd");
    const weekEnd = format(endOfISOWeek(today), "yyyy-MM-dd");
    const currentPeriod = periods.find((p) => p.startDate <= weekStart && p.endDate >= weekEnd);
    const pendingCount = payouts.filter((p) => ["pending", "approved"].includes(p.status)).length;
    const thisWeekPayouts = payouts.filter((p) => p.payrollPeriodId === currentPeriod?.id);
    const thisWeekTotal = thisWeekPayouts.reduce((s, p) => s + p.totalPay, 0);
    const currentWeekNum = getISOWeek(today);

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Week {currentWeekNum} Summary</p>
                {isLoading ? (
                    <div className="space-y-2">
                        <div className="h-6 w-40 bg-gray-100 rounded animate-pulse" />
                        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                    </div>
                ) : (
                    <>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">This week total due</p>
                            <p className="text-xl font-bold text-gray-900">
                                {thisWeekTotal > 0 ? `Rp ${thisWeekTotal.toLocaleString("id-ID")}` : "—"}
                            </p>
                            {thisWeekPayouts.length > 0 && <p className="text-xs text-gray-400">{thisWeekPayouts.length} staff</p>}
                        </div>
                        {pendingCount > 0 && (
                            <div className="bg-amber-50 rounded-lg px-3 py-2">
                                <p className="text-sm text-amber-700 font-medium">
                                    {pendingCount} payout{pendingCount !== 1 ? "s" : ""} pending review
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Operations</p>
                <div className="bg-white rounded-xl px-4">
                    <MenuRow icon={<Users size={20} />} label="Staff Pay Periods" onClick={() => navigation.push(url("/mobile/pay/periods"))} />
                    <MenuRow icon={<ReceiptText size={20} />} label="Claims" onClick={() => navigation.push(url("/mobile/pay/claims"))} />
                    <MenuRow icon={<UserCog size={20} />} label="Staff Payroll Info" onClick={() => navigation.push(url("/mobile/pay/staff"))} />
                </div>
            </div>

            <div className="space-y-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide px-1">Config</p>
                <div className="bg-white rounded-xl px-4">
<MenuRow icon={<Award size={20} />} label="Commission Types" onClick={() => navigation.push(url("/mobile/pay/commission-types"))} />
                    <MenuRow icon={<Tag size={20} />} label="Claim Types" onClick={() => navigation.push(url("/mobile/pay/claim-types"))} />
                </div>
            </div>
        </div>
    );
}
