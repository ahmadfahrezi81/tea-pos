"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Lock, LockOpen } from "lucide-react";
import { PillSwitcher } from "./PillSwitcher";
import type { TimelineEventResponse } from "@tea-pos/features/activity-logs/schema";
import { EVENT_COLOR, EVENT_LABEL, formatEventTime } from "@/lib/constants/activity-log-events";

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

function formatTimeShort(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const ampm = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${ampm}`;
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

function getCurrentProgress(
    openTime: string,
    closeTime: string,
    currentTime?: string,
): number {
    const current = getCurrentMinutes(currentTime);
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    return Math.min(Math.max(((current - open) / (close - open)) * 100, 0), 100);
}

// ─── Event marker helpers ─────────────────────────────────────────────────────

function createdAtToLocalMinutes(createdAt: string): number {
    const tz = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7", 10);
    const localMs = new Date(createdAt).getTime() + tz * 3600 * 1000;
    const d = new Date(localMs);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
}


// ─── Tooltip portal ───────────────────────────────────────────────────────────

interface TooltipPortalProps {
    label: string;
    anchorRef: React.RefObject<HTMLDivElement | null>;
    align?: "left" | "center" | "right";
}

function TooltipPortal({
    label,
    anchorRef,
    align = "center",
}: TooltipPortalProps) {
    if (!anchorRef.current) return null;

    const rect = anchorRef.current.getBoundingClientRect();
    const top = rect.top - 24;
    const style: React.CSSProperties = { top, position: "fixed" };

    if (align === "left") {
        style.left = rect.left;
    } else if (align === "right") {
        style.right = window.innerWidth - rect.right;
    } else {
        style.left = rect.left + rect.width / 2;
    }

    const translateClass = align === "center" ? "-translate-x-1/2" : "";

    return createPortal(
        <div
            className={`fixed z-9999 bg-gray-800 text-white text-[11px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg pointer-events-none ${translateClass}`}
            style={style}
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
    const progress = getCurrentProgress(openTime, closeTime, currentTime);
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    const totalMinutes = close - open;

    const scrollRef = useRef<HTMLDivElement>(null);
    const progressMarkerRef = useRef<HTMLDivElement>(null);
    const openIconRef = useRef<HTMLDivElement>(null);
    const closeIconRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<string | null>(null);
    const [activeEventId, setActiveEventId] = useState<string | null>(null);

    const greeting = useMemo(() => getGreeting(), []);

    const displayTime = currentTime
        ? formatTime(timeToMinutes(currentTime))
        : new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
          });

    useEffect(() => {
        const container = scrollRef.current;
        const marker = progressMarkerRef.current;
        if (!container || !marker) return;
        const markerLeft = (progress / 100) * (BAR_WIDTH - 48);
        const containerWidth = container.offsetWidth;
        const scrollTo = markerLeft - containerWidth / 2;
        container.scrollTo({ left: scrollTo, behavior: "smooth" });
    }, [progress]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const handleScroll = () => {
            setTooltip(null);
            setActiveEventId(null);
        };
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
                <div
                    style={{ width: BAR_WIDTH }}
                    className="relative px-4 py-4 pb-8"
                >
                    <div className="relative flex items-center">
                        {/* Open icon */}
                        <div
                            ref={openIconRef}
                            className="absolute -left-4 z-20 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center border-2 border-gray-50 cursor-pointer"
                            onClick={() =>
                                setTooltip(
                                    tooltip === "Store Open" ? null : "Store Open",
                                )
                            }
                        >
                            <LockOpen size={22} strokeWidth={2} className="text-white" />
                        </div>
                        {tooltip === "Store Open" && (
                            <TooltipPortal
                                label={`Store Open · ${openTime}`}
                                anchorRef={openIconRef}
                                align="left"
                            />
                        )}

                        {/* Track — segmented per hour */}
                        <div className="w-full flex items-center gap-1">
                            {Array.from({ length: totalMinutes / 60 }).map((_, i) => {
                                const segmentStart = (i / (totalMinutes / 60)) * 100;
                                const segmentEnd = ((i + 1) / (totalMinutes / 60)) * 100;
                                const isFull = progress >= segmentEnd;
                                const isPartial =
                                    progress > segmentStart && progress < segmentEnd;
                                const fillPct = isPartial
                                    ? ((progress - segmentStart) /
                                          (segmentEnd - segmentStart)) *
                                      100
                                    : 0;

                                return (
                                    <div
                                        key={i}
                                        className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden"
                                    >
                                        {(isFull || isPartial) && (
                                            <div
                                                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                                                style={{
                                                    width: isFull ? "100%" : `${fillPct}%`,
                                                }}
                                            >
                                                <div className="absolute top-0.5 left-1 right-1 h-0.5 rounded-full bg-white/20" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Event markers */}
                        {events.map((event) => {
                            const mins = createdAtToLocalMinutes(event.createdAt);
                            const pos = Math.min(
                                Math.max(((mins - open) / (close - open)) * 100, 0),
                                100,
                            );
                            const isActive = activeEventId === event.id;
                            return (
                                <div
                                    key={event.id}
                                    className="absolute top-1/2 -translate-y-1/2 z-10"
                                    style={{ left: `${pos}%` }}
                                >
                                    {isActive && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-md whitespace-nowrap pointer-events-none z-30">
                                            {EVENT_LABEL[event.type] ?? event.type} ·{" "}
                                            {formatEventTime(event.createdAt)}
                                        </div>
                                    )}
                                    <button
                                        onClick={() =>
                                            setActiveEventId(isActive ? null : event.id)
                                        }
                                        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${EVENT_COLOR[event.type] ?? "bg-gray-400"}`}
                                    />
                                </div>
                            );
                        })}

                        {/* Close icon */}
                        <div
                            ref={closeIconRef}
                            className="absolute -right-4 z-20 w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-50 cursor-pointer"
                            onClick={() =>
                                setTooltip(
                                    tooltip === "Store Close" ? null : "Store Close",
                                )
                            }
                        >
                            <Lock size={22} strokeWidth={2} className="text-gray-400" />
                        </div>
                        {tooltip === "Store Close" && (
                            <TooltipPortal
                                label={`Store Close · ${closeTime}`}
                                anchorRef={closeIconRef}
                                align="right"
                            />
                        )}

                        {/* Progress marker ref point */}
                        <div
                            ref={progressMarkerRef}
                            className="absolute"
                            style={{ left: `${progress}%` }}
                        />
                    </div>

                    {/* Time labels */}
                    <div className="relative w-full mt-5 px-0">
                        {Array.from({ length: totalMinutes / 60 + 1 }).map((_, i) => {
                            if (i === totalMinutes / 60) return null;
                            const pct = (i / (totalMinutes / 60)) * 100;
                            const mins = open + i * 60;
                            const label = formatTimeShort(mins);
                            return (
                                <span
                                    key={i}
                                    className="absolute text-xs text-gray-500 -translate-x-1/2"
                                    style={{ left: `${pct}%` }}
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
