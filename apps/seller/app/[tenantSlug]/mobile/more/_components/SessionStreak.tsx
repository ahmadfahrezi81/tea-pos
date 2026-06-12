"use client";

import { useSessionActivity } from "@/lib/hooks/sessions/useSessionActivity";

const DAYS = 14;

function buildStrip() {
    const today = new Date();
    return Array.from({ length: DAYS }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (DAYS - 1 - i));
        return { iso: d.toISOString().slice(0, 10), day: d.getDate() };
    });
}

export default function SessionStreak() {
    const { dates, isLoading } = useSessionActivity(3);
    const worked = new Set(dates);
    const strip = buildStrip();

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl px-4 py-3">
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-gray-900">Last 14 days</p>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
                {strip.map(({ iso, day }) => (
                    <div key={iso} className="flex flex-col items-center gap-1">
                        <p className="text-[9px] font-medium text-gray-500">{day}</p>
                        <div className={`aspect-square w-full rounded-[4px] ${worked.has(iso) ? "bg-brand" : "bg-gray-100"}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
