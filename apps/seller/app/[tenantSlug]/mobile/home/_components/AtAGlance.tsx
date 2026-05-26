"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { PillSwitcher } from "./PillSwitcher";
import type { TimelineEventResponse } from "@tea-pos/features/activity-logs/schema";
import { EVENT_COLOR, EVENT_ICON, EVENT_LABEL, formatEventTime } from "@/lib/constants/activity-log-events";

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

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
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

interface AtAGlanceProps {
    openTime?: string;
    closeTime?: string;
    currentTime?: string;
    events?: TimelineEventResponse[];
}

const BAR_WIDTH = 900;

export function AtAGlance({
    openTime = "10:00",
    closeTime = "22:00",
    currentTime,
    events = [],
}: AtAGlanceProps) {
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    const totalMinutes = close - open;
    const numHours = totalMinutes / 60;

    const scrollRef = useRef<HTMLDivElement>(null);
    const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [activeEventId, setActiveEventId] = useState<string | null>(null);

    const greeting = useMemo(() => getGreeting(), []);

    const displayTime = currentTime
        ? formatTime(timeToMinutes(currentTime))
        : new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    // Flex value per hour — grows with event density
    const hourFlexValues = useMemo(() => {
        const counts = new Array(numHours).fill(0);
        events.forEach((event) => {
            const mins = createdAtToLocalMinutes(event.createdAt);
            const idx = Math.floor((mins - open) / 60);
            if (idx >= 0 && idx < numHours) counts[idx]++;
        });
        return (counts as number[]).map((c) => Math.max(1, 1 + c * 0.6));
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
        const now = getCurrentMinutes(currentTime);
        const rawIdx = (now - open) / 60;
        if (rawIdx <= 0) return 0;
        if (rawIdx >= numHours) return 1;
        const hourIdx = Math.floor(rawIdx);
        const frac = rawIdx - hourIdx;
        return Math.min(
            Math.max((cumFlex[hourIdx] + frac * hourFlexValues[hourIdx]) / totalFlex, 0),
            1,
        );
    }, [currentTime, open, numHours, cumFlex, hourFlexValues, totalFlex]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const markerLeft = progressPos * (BAR_WIDTH - 48);
        const containerWidth = container.offsetWidth;
        container.scrollTo({ left: markerLeft - containerWidth / 2, behavior: "smooth" });
    }, [progressPos]);

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
                        {formatDate()} · {displayTime}
                    </p>
                </div>
                <PillSwitcher />
            </div>

            {/* Scrollable progress bar */}
            <div
                ref={scrollRef}
                className="overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:mx-6"
            >
                <div style={{ width: BAR_WIDTH }} className="relative px-4 py-4 pb-8">
                    <div className="relative flex items-center">
                        {/* Track — variable-width pills per hour */}
                        <div className="w-full flex items-center gap-1">
                            {hourFlexValues.map((flexVal, i) => {
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
                                        className="h-4 bg-gray-200 rounded-full overflow-hidden"
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
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 border-white shadow-sm transition-colors duration-300 ${
                                            isPassed
                                                ? (EVENT_COLOR[event.type] ?? "bg-gray-400")
                                                : "bg-gray-200"
                                        }`}
                                    >
                                        <Icon
                                            size={18}
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

                    {/* Time labels — proportional to pill widths */}
                    <div className="relative w-full mt-3">
                        {hourFlexValues.map((_, i) => (
                            <span
                                key={i}
                                className="absolute text-[10px] text-gray-400 -translate-x-1/2"
                                style={{ left: `${(cumFlex[i] / totalFlex) * 100}%` }}
                            >
                                {formatTimeShort(open + i * 60)}
                            </span>
                        ))}
                        <span
                            className="absolute text-[10px] text-gray-400 -translate-x-full"
                            style={{ left: "100%" }}
                        >
                            {formatTimeShort(close)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
