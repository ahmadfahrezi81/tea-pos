"use client";

import { use } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { usePayrollPeriods, usePayrollEntries } from "@/lib/hooks/payroll/usePayroll";
import { useStores } from "@/lib/hooks/stores/useStores";
import { parseISO, format, eachDayOfInterval, getISOWeek } from "date-fns";
import type { PayrollEntryResponse } from "@tea-pos/features/payroll/schema";

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

export default function PeriodDetailPage({ params }: { params: Promise<{ periodId: string }> }) {
    const { periodId } = use(params);
    const { user } = useAuth();
    const { periods } = usePayrollPeriods();
    const { entries, isLoading } = usePayrollEntries(
        user?.id ? { userId: user.id, periodId } : undefined,
    );
    const { data: storesData } = useStores();

    const period = periods.find((p) => p.id === periodId);
    const stores = storesData?.stores ?? [];

    function getStoreName(storeId: string) {
        return stores.find((s) => s.id === storeId)?.name ?? storeId.slice(-8);
    }

    const totalCups = entries.reduce((s, e) => s + e.totalCups, 0);
    const totalPay = entries.reduce((s, e) => s + e.grossPay, 0);
    const rates = [...new Set(entries.map((e) => e.ratePerCup))];
    const singleRate = rates.length === 1 ? rates[0] : null;

    const days = period
        ? eachDayOfInterval({ start: parseISO(period.startDate), end: parseISO(period.endDate) })
        : [];

    const entriesByDate = entries.reduce<Record<string, PayrollEntryResponse[]>>((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
    }, {});

    return (
        <div className="space-y-3">
            {/* Period header */}
            {period && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-700">
                            Week {getISOWeek(parseISO(period.startDate))} ·{" "}
                            {format(parseISO(period.startDate), "MMM d")}–
                            {format(parseISO(period.endDate), "MMM d, yyyy")}
                        </span>
                        <StatusBadge status={period.status} />
                    </div>
                    {!isLoading && entries.length > 0 && (
                        <>
                            <p className="text-xl font-bold text-gray-900">
                                {totalCups} cups · Rp {totalPay.toLocaleString("id-ID")}
                            </p>
                            {singleRate !== null && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Rate: Rp {singleRate.toLocaleString("id-ID")} / cup
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Day-by-day breakdown */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                            <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : days.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400">Period not found.</p>
                ) : (
                    days.map((day, idx) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayEntries = entriesByDate[dateStr] ?? [];
                        const isLast = idx === days.length - 1;

                        return (
                            <div key={dateStr} className={`px-4 py-3 ${!isLast ? "border-b border-gray-100" : ""}`}>
                                {dayEntries.length === 0 ? (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-500">
                                            {format(day, "EEE d MMM")}
                                        </span>
                                        <span className="text-sm text-gray-300">— — —</span>
                                    </div>
                                ) : dayEntries.length === 1 ? (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">
                                                {format(day, "EEE d MMM")}
                                            </span>
                                            <span className="ml-2 text-xs text-gray-400">
                                                {getStoreName(dayEntries[0].storeId)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm text-gray-700">
                                                {dayEntries[0].totalCups} cups
                                            </span>
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                Rp {dayEntries[0].grossPay.toLocaleString("id-ID")}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="text-sm font-medium text-gray-800 block mb-1">
                                            {format(day, "EEE d MMM")}
                                        </span>
                                        {dayEntries.map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between pl-4">
                                                <span className="text-xs text-gray-400">
                                                    {getStoreName(entry.storeId)}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-sm text-gray-700">
                                                        {entry.totalCups} cups
                                                    </span>
                                                    <span className="ml-2 text-sm font-medium text-gray-900">
                                                        Rp {entry.grossPay.toLocaleString("id-ID")}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
