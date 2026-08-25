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

export default function WorkDays() {
    const { dates, isLoading } = useSessionActivity(4);
    const worked = new Set(dates);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isLoading) return;
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTo({ left: scrollRef.current.scrollWidth, behavior: "auto" });
            }
        });
    }, [isLoading]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl px-3 py-3">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            </div>
        );
    }

    const weeks = buildWeeks();

    return (
        <div className="bg-white rounded-2xl px-3 py-3">
            <div ref={scrollRef} className="flex gap-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {weeks.map(({ weekNum, days, isCurrent, todayIso }) => (
                    <div key={weekNum} className="flex-none flex flex-col gap-1.5">
                        <p className="flex items-center gap-1 text-sm font-semibold text-gray-500">
                            Week {weekNum}
                            {/* A green dot marks the week in progress — quieter than
                                the word, and it never widens the column. */}
                            {isCurrent && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        </p>
                        <div className="flex gap-1.5">
                            {days.map((iso) => {
                                const isUpcoming = iso > todayIso;
                                return (
                                    <div
                                        key={iso}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium ${
                                            worked.has(iso)
                                                ? "bg-brand text-white font-semibold"
                                                : isUpcoming
                                                ? "border border-dashed border-gray-300 text-gray-400"
                                                : "bg-gray-100 text-gray-500"
                                        }`}
                                    >
                                        {+iso.slice(8)}
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
