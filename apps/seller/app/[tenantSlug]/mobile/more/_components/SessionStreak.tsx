"use client";

import { useRef, useEffect } from "react";
import { useSessionActivity } from "@/lib/hooks/sessions/useSessionActivity";
import { getWeekInfo } from "@tea-pos/utils/week";

const PAST_WEEKS = 3;
const TZ_MS = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7") * 3_600_000;
const DAY_MS = 86_400_000;

function localIso(utcMs: number): string {
    return new Date(utcMs + TZ_MS).toISOString().slice(0, 10);
}

function buildWeeks() {
    const nowMs = Date.now();
    const localDow = new Date(nowMs + TZ_MS).getUTCDay(); // 0=Sun
    const daysFromMon = localDow === 0 ? 6 : localDow - 1;
    const todayStartMs = Math.floor((nowMs + TZ_MS) / DAY_MS) * DAY_MS - TZ_MS;
    const todayIso = localIso(todayStartMs);
    const mondayMs = todayStartMs - daysFromMon * DAY_MS;

    return Array.from({ length: PAST_WEEKS + 1 }, (_, i) => {
        const weeksBack = PAST_WEEKS - i;
        const weekMondayMs = mondayMs - weeksBack * DAY_MS * 7;
        const { weekNum } = getWeekInfo(localIso(weekMondayMs));
        const days = Array.from({ length: 7 }, (_, d) => localIso(weekMondayMs + d * DAY_MS));
        return { weekNum, days, isCurrent: weeksBack === 0, todayIso };
    });
}

export default function SessionStreak() {
    const { dates, isLoading } = useSessionActivity(4);
    const worked = new Set(dates);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "auto" });
            }
        });
    }, []);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl px-4 py-3">
                <div className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    const weeks = buildWeeks();

    return (
        <div className="bg-white rounded-2xl px-4 py-3">
            <div ref={scrollRef} className="flex gap-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {weeks.map(({ weekNum, days, isCurrent, todayIso }) => (
                    <div key={weekNum} className="flex-none flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-gray-600">Week {weekNum}{isCurrent && " (current)"}</p>
                        <div className="flex gap-1.5">
                            {days.map((iso) => {
                                const isUpcoming = iso > todayIso;
                                return (
                                <div key={iso} className="flex flex-col items-center gap-1">
                                    <div
                                        className={`w-6 h-6 rounded ${
                                            worked.has(iso)
                                                ? "bg-brand"
                                                : isUpcoming
                                                ? "border border-dashed border-gray-300"
                                                : "bg-gray-200"
                                        }`}
                                    />
                                    <p className="text-xs leading-none text-gray-600">{+iso.slice(8)}</p>
                                </div>
                            );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
