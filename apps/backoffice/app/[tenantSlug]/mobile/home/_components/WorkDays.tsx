"use client";

import { getWeekInfo } from "@tea-pos/utils/week";
import { useStoreFilter } from "@/lib/context/StoreFilterContext";
import { useWorkDays } from "@/lib/hooks/home/useHome";
import { Skeleton } from "@tea-pos/ui/custom/Skeleton";

/* The seller's own work-days grid, asked tenant-wide: a filled square is a day
   at least one active store opened. Expected to be solid — a grey square in the
   middle of the run is a day nobody traded.

   Weeks stack as rows rather than scrolling sideways: the card is a square half
   the screen wide, and four rows of seven fit it exactly where four columns of
   seven would not. */

const PAST_WEEKS = 3;
const TZ_MS = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7") * 3_600_000;
const DAY_MS = 86_400_000;

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

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
    const { selectedStoreId } = useStoreFilter();
    const { dates, isLoading } = useWorkDays(PAST_WEEKS + 1, selectedStoreId);

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-3 aspect-square">
                <Skeleton className="h-full rounded-lg" />
            </div>
        );
    }

    const worked = new Set(dates);
    const weeks = buildWeeks();
    const elapsed = weeks.flatMap((w) => w.days).filter((iso) => iso <= weeks[0].todayIso);
    const openCount = elapsed.filter((iso) => worked.has(iso)).length;

    return (
        <div className="bg-white rounded-2xl p-3 aspect-square flex flex-col">
            <div className="flex items-baseline justify-between gap-1">
                <p className="text-sm font-bold text-gray-900">Open days</p>
                <p className="text-xs font-medium text-gray-500">
                    <span className="font-mono font-bold text-gray-900">{openCount}</span>/
                    {elapsed.length}
                </p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-1.5">
                <div className="flex gap-1">
                    {DAY_LETTERS.map((letter, i) => (
                        <p
                            key={i}
                            className="flex-1 text-center text-[10px] leading-none text-gray-400"
                        >
                            {letter}
                        </p>
                    ))}
                </div>

                {weeks.map(({ weekNum, days, isCurrent, todayIso }) => (
                    <div key={weekNum} className="flex gap-1">
                        {days.map((iso) => {
                            const isUpcoming = iso > todayIso;
                            const isToday = iso === todayIso;
                            return (
                                <div
                                    key={iso}
                                    title={iso}
                                    className={`flex-1 aspect-square rounded-sm ${
                                        worked.has(iso)
                                            ? "bg-brand"
                                            : isUpcoming
                                              ? "border border-dashed border-gray-300"
                                              : "bg-gray-200"
                                    } ${isCurrent && isToday ? "ring-1 ring-gray-400" : ""}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
