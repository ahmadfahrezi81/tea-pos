"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/hooks/useT";
import { useDayActivityBigEvents } from "@/lib/hooks/activity-logs/useStoreActivityLogs";
import { useStore } from "@/lib/context/StoreContext";
import { PillSwitcher } from "./PillSwitcher";
import type { TimelineEventResponse } from "@tea-pos/features/activity-logs/schema";
import { EVENT_COLOR, EVENT_ICON, EVENT_LABEL, formatEventTime } from "@/lib/constants/activity-log-events";
import { getWeekInfo } from "@tea-pos/utils/week";

// ─── Time helpers ─────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function getCurrentMinutes(currentTime?: string): number {
    if (currentTime) return timeToMinutes(currentTime);
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(): string {
    return new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "long",
    });
}

function getGreetingKey(): "morning" | "afternoon" | "evening" {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
}

function formatTimeShort(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${ampm}`;
}

function createdAtToLocalMinutes(createdAt: string): number {
    const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
    const localMs = new Date(createdAt).getTime() + tz * 3600 * 1000;
    const d = new Date(localMs);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ─── Tooltip portal ───────────────────────────────────────────────────────────

function TooltipPortal({ label, anchorRef }: { label: string; anchorRef: React.RefObject<HTMLDivElement | null> }) {
    if (!anchorRef.current) return null;
    const rect = anchorRef.current.getBoundingClientRect();
    return createPortal(
        <div
            className="fixed z-[9999] bg-gray-800 text-white text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg pointer-events-none -translate-x-1/2"
            style={{ top: rect.top - 28, left: rect.left + rect.width / 2 }}
        >
            {label}
        </div>,
        document.body,
    );
}

// ─── AtAGlance ────────────────────────────────────────────────────────────────

const MIN_BAR_WIDTH = 900;
const BUFFER_MINUTES = 60;
const ICON_SIZE = 36;
const ICON_SLOT_GAP = 2; // tiny edge gap when computing slot count
const MIN_HOUR_PX = 50;
const BAR_PADDING_PX = 32; // px-4 × 2
const HOUR_GAP_PX = 4; // gap-1

interface AtAGlanceProps {
    events?: TimelineEventResponse[];
    summaryId?: string;
}

export function AtAGlance({ events: passedEvents, summaryId }: AtAGlanceProps) {
    const { selectedStore } = useStore();
    const { segments: fetchedEvents } = useDayActivityBigEvents(summaryId);

    // Use passed events or fetch them
    const events = useMemo(() => {
        const sourceEvents = passedEvents ?? fetchedEvents;
        return sourceEvents.filter((e) => e.type !== "order_created");
    }, [passedEvents, fetchedEvents]);

    const openTime = selectedStore?.openTime ?? "10:00";
    const closeTime = selectedStore?.closeTime ?? "22:00";
    const open = timeToMinutes(openTime) - BUFFER_MINUTES;
    const close = timeToMinutes(closeTime) + BUFFER_MINUTES;
    const totalMinutes = close - open;
    const numHours = totalMinutes / 60;

    const scrollRef = useRef<HTMLDivElement>(null);
    const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [activeEventId, setActiveEventId] = useState<string | null>(null);

    const t = useT();
    const greeting = t(`home.greeting.${getGreetingKey()}`);

    // Flex values and bar width — count-based: each hour gets enough room to fit N icons side-by-side
    const { hourFlexValues, dynamicBarWidth } = useMemo(() => {
        const counts = new Array<number>(numHours).fill(0);
        events.forEach((event) => {
            const mins = createdAtToLocalMinutes(event.createdAt);
            const idx = Math.floor((mins - open) / 60);
            if (idx >= 0 && idx < numHours) counts[idx]++;
        });

        const minWidths = counts.map((n) =>
            n <= 1 ? MIN_HOUR_PX : Math.max(MIN_HOUR_PX, n * ICON_SIZE + (n - 1) * ICON_SLOT_GAP),
        );

        const totalPillPx = minWidths.reduce((s, w) => s + w, 0);
        const barWidth = Math.max(
            MIN_BAR_WIDTH,
            totalPillPx + BAR_PADDING_PX + (numHours - 1) * HOUR_GAP_PX,
        );
        const avgPx = totalPillPx / numHours;
        const flexValues = minWidths.map((w) => w / avgPx);

        return { hourFlexValues: flexValues, dynamicBarWidth: barWidth };
    }, [events, open, numHours]);

    const totalFlex = useMemo(
        () => hourFlexValues.reduce((sum, v) => sum + v, 0),
        [hourFlexValues],
    );

    // Cumulative flex prefix sums (length = numHours + 1)
    const cumFlex = useMemo(() => {
        const out = [0];
        hourFlexValues.forEach((v, i) => out.push(out[i] + v));
        return out;
    }, [hourFlexValues]);

    // Map absolute minutes to 0..1 proportional bar position
    const timeToPos = (mins: number): number => {
        const rawIdx = (mins - open) / 60;
        if (rawIdx <= 0) return 0;
        if (rawIdx >= numHours) return 1;
        const hourIdx = Math.floor(rawIdx);
        const frac = rawIdx - hourIdx;
        return (cumFlex[hourIdx] + frac * hourFlexValues[hourIdx]) / totalFlex;
    };

    const progressPos = useMemo(() => {
        const now = getCurrentMinutes();
        const rawIdx = (now - open) / 60;
        if (rawIdx <= 0) return 0;
        if (rawIdx >= numHours) return 1;
        const hourIdx = Math.floor(rawIdx);
        const frac = rawIdx - hourIdx;
        return Math.min(
            Math.max((cumFlex[hourIdx] + frac * hourFlexValues[hourIdx]) / totalFlex, 0),
            1,
        );
    }, [open, numHours, cumFlex, hourFlexValues, totalFlex]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const markerLeft = progressPos * (dynamicBarWidth - BAR_PADDING_PX);
        const containerWidth = container.offsetWidth;
        container.scrollTo({ left: markerLeft - containerWidth / 2, behavior: "smooth" });
    }, [progressPos, dynamicBarWidth]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const handleScroll = () => setActiveEventId(null);
        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="overflow-visible">
            {/* Header */}
            <div className="pb-3 flex items-start justify-between">
                <div>
                    <p className="text-xl font-bold text-gray-900 tracking-tight">
                        {greeting}
                    </p>
                    <p className="text-base text-gray-600">
                        {getWeekInfo().label} · {formatDate()}
                    </p>
                </div>
                <PillSwitcher />
            </div>

            {/* Scrollable progress bar */}
            <div
                ref={scrollRef}
                className="overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:hidden"
            >
                <div style={{ width: dynamicBarWidth }} className="relative px-4 py-4 pb-8">
                    <div className="relative flex items-center">
                        {/* Track — variable-width pills per hour, first/last are buffer zones */}
                        <div className="w-full flex items-center gap-1">
                            {hourFlexValues.map((flexVal, i) => {
                                const isBuffer = i === 0 || i === numHours - 1;
                                const segStart = cumFlex[i] / totalFlex;
                                const segEnd = cumFlex[i + 1] / totalFlex;
                                const isFull = progressPos >= segEnd;
                                const isPartial =
                                    progressPos > segStart && progressPos < segEnd;
                                const fillPct = isPartial
                                    ? ((progressPos - segStart) / (segEnd - segStart)) * 100
                                    : 0;

                                return (
                                    <div
                                        key={i}
                                        style={{ flex: flexVal }}
                                        className={`h-4 rounded-full overflow-hidden ${isBuffer ? "bg-gray-200/50" : "bg-gray-200"}`}
                                    >
                                        {(isFull || isPartial) && (
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                                                style={{
                                                    width: isFull ? "100%" : `${fillPct}%`,
                                                }}
                                            >
                                                <div className="absolute top-0 left-0 right-0 h-1/2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Event icon markers */}
                        {events.map((event) => {
                            const Icon = EVENT_ICON[event.type];
                            if (!Icon) return null;
                            const mins = createdAtToLocalMinutes(event.createdAt);
                            const pos = Math.min(Math.max(timeToPos(mins), 0), 1);
                            const isActive = activeEventId === event.id;
                            const isPassed = progressPos >= pos;
                            const anchorRef: React.RefObject<HTMLDivElement | null> = {
                                current: eventRefs.current[event.id] ?? null,
                            };

                            return (
                                <div
                                    key={event.id}
                                    ref={(el) => { eventRefs.current[event.id] = el; }}
                                    className="absolute top-1/2 z-10"
                                    style={{
                                        left: `${pos * 100}%`,
                                        transform: "translate(-50%, -50%)",
                                    }}
                                >
                                    {isActive && (
                                        <TooltipPortal
                                            label={`${EVENT_LABEL[event.type] ?? event.type} · ${formatEventTime(event.createdAt)}`}
                                            anchorRef={anchorRef}
                                        />
                                    )}
                                    <button
                                        onClick={() =>
                                            setActiveEventId(isActive ? null : event.id)
                                        }
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 border-white shadow-sm transition-colors duration-300 ${
                                            isPassed
                                                ? (EVENT_COLOR[event.type] ?? "bg-gray-400")
                                                : "bg-gray-200"
                                        }`}
                                    >
                                        <Icon
                                            size={24}
                                            strokeWidth={2}
                                            className={isPassed ? "text-white" : "text-gray-400"}
                                        />
                                    </button>
                                </div>
                            );
                        })}

                        {/* Progress marker anchor */}
                        <div
                            className="absolute"
                            style={{ left: `${progressPos * 100}%` }}
                        />
                    </div>

                    {/* Time labels — skip first and last (buffer zones) */}
                    <div className="relative w-full mt-3">
                        {hourFlexValues.map((_, i) => {
                            if (i === 0) return null;
                            return (
                                <span
                                    key={i}
                                    className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                                    style={{ left: `${(cumFlex[i] / totalFlex) * 100}%` }}
                                >
                                    {formatTimeShort(open + i * 60)}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
