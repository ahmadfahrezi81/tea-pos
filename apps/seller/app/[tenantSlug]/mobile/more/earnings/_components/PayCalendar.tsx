"use client";

import { useMemo } from "react";
import {
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    getISOWeek,
    isSameMonth,
    startOfMonth,
    startOfWeek,
} from "date-fns";
import { useTenantSlug } from "@tea-pos/utils/server-config/tenant-url";
import { navigation } from "@tea-pos/utils/navigation";
import { useSessionActivityByMonth } from "@/lib/hooks/sessions/useSessionActivityByMonth";
import type { PayrollCommissionResponse, PayrollPeriodResponse } from "@tea-pos/features/payroll/schema";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateKey(date: Date) {
    return format(date, "yyyy-MM-dd");
}

export function PayCalendar({
    month,
    commissions,
    periods,
    isLoading,
}: {
    month: Date;
    commissions: PayrollCommissionResponse[];
    periods: PayrollPeriodResponse[];
    isLoading: boolean;
}) {
    const { url } = useTenantSlug();

    const weeks = useMemo(() => {
        const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
        const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

        const rows: Date[][] = [];
        for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
        return rows;
    }, [month]);

    const { dates: sessionDates, isLoading: sessionLoading } = useSessionActivityByMonth(format(month, "yyyy-MM"));

    const workedDates = useMemo(() => {
        const set = new Set<string>();
        sessionDates.forEach((d) => set.add(d));
        commissions.forEach((c) => set.add(c.date));
        return set;
    }, [sessionDates, commissions]);

    const commissionDates = useMemo(() => {
        const set = new Set<string>();
        commissions.forEach((c) => set.add(c.date));
        return set;
    }, [commissions]);

    const findPeriodIdForDate = (dateKey: string) =>
        periods.find((p) => p.startDate <= dateKey && dateKey <= p.endDate)?.id ?? null;

    const handleDayClick = (dateKey: string) => {
        if (!commissionDates.has(dateKey)) return;
        const periodId = findPeriodIdForDate(dateKey);
        if (periodId) navigation.push(url(`/mobile/more/earnings/${periodId}`));
    };

    if (isLoading || sessionLoading) {
        return (
            <div className="bg-white rounded-2xl px-3 py-3">
                <div className="h-44 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl px-3 py-3 space-y-1.5">
            <div className="grid grid-cols-8 gap-1">
                <span />
                {WEEKDAY_LABELS.map((d) => (
                    <span key={d} className="text-[10px] font-semibold text-gray-400 text-center">
                        {d}
                    </span>
                ))}
            </div>

            <div className="space-y-1">
                {weeks.map((row) => (
                    <div key={row[0].toISOString()} className="grid grid-cols-8 gap-1 items-center">
                        <span className="text-[10px] font-semibold text-gray-500 text-center">
                            W{getISOWeek(row[0])}
                        </span>
                        {row.map((day) => {
                            const dateKey = toDateKey(day);
                            const worked = workedDates.has(dateKey);
                            const inMonth = isSameMonth(day, month);

                            return (
                                <button
                                    key={dateKey}
                                    onClick={() => handleDayClick(dateKey)}
                                    disabled={!commissionDates.has(dateKey)}
                                    className={`w-7 h-7 mx-auto flex items-center justify-center rounded-md text-xs ${
                                        worked
                                            ? "bg-brand text-white font-semibold"
                                            : inMonth
                                            ? "bg-gray-100 text-gray-700"
                                            : "text-gray-300"
                                    }`}
                                >
                                    {format(day, "d")}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
