"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { usePayrollPeriods, usePayrollEntries } from "@/lib/hooks/payroll/usePayroll";
import { useCommissionConfig } from "@/lib/hooks/commission-configs/useCommissionConfig";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { getISOWeek, parseISO, format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { PayrollPeriodResponse, PayrollEntryResponse } from "@tea-pos/features/payroll/schema";

function formatDateRange(startDate: string, endDate: string) {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        open: "bg-gray-100 text-gray-600",
        processing: "bg-blue-100 text-blue-700",
        paid: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
        open: "Open",
        processing: "Processing",
        paid: "Paid ✓",
    };
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.open}`}>
            {labels[status] ?? status}
        </span>
    );
}

export default function EarningsPage() {
    const { user } = useAuth();
    const { url } = useTenantSlug();
    const { periods, isLoading: periodsLoading } = usePayrollPeriods();
    const { entries, isLoading: entriesLoading } = usePayrollEntries(
        user?.id ? { userId: user.id } : undefined,
    );
    const { ratePerCup, effectiveDate, isLoading: rateLoading } = useCommissionConfig("USER");

    const isLoading = periodsLoading || entriesLoading || rateLoading;

    const entriesByPeriod = entries.reduce<Record<string, PayrollEntryResponse[]>>((acc, entry) => {
        const key = entry.payrollPeriodId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});

    return (
        <div className="space-y-3">
            {/* Rate card */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-0.5">Seller Rate</p>
                {rateLoading ? (
                    <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                ) : ratePerCup === 0 ? (
                    <p className="text-sm font-medium text-amber-600">No rate configured</p>
                ) : (
                    <>
                        <p className="text-xl font-bold text-gray-900">
                            Rp {ratePerCup.toLocaleString("id-ID")} / cup
                        </p>
                        {effectiveDate && (
                            <p className="text-xs text-gray-400 mt-0.5">
                                Effective {format(parseISO(effectiveDate), "d MMM yyyy")}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Period list */}
            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl p-4 h-16 animate-pulse" />
                    ))}
                </div>
            ) : periods.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">No payroll periods yet.</p>
            ) : (
                <div className="space-y-2">
                    {(periods as PayrollPeriodResponse[]).map((period) => {
                        const periodEntries = entriesByPeriod[period.id] ?? [];
                        const totalCups = periodEntries.reduce((s, e) => s + e.totalCups, 0);
                        const totalPay = periodEntries.reduce((s, e) => s + e.grossPay, 0);
                        const weekNum = getISOWeek(parseISO(period.startDate));
                        const hasEntries = periodEntries.length > 0;

                        return (
                            <button
                                key={period.id}
                                onClick={() => navigation.push(url(`/mobile/account/earnings/${period.id}`))}
                                className="w-full bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 text-left active:bg-gray-50"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-gray-900">
                                            Week {weekNum} · {formatDateRange(period.startDate, period.endDate)}
                                        </span>
                                        <StatusBadge status={period.status} />
                                    </div>
                                    {hasEntries ? (
                                        <p className="text-xs text-gray-500">
                                            {totalCups} cups · Rp {totalPay.toLocaleString("id-ID")}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400">No shifts · Rp 0</p>
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
