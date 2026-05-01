"use client";

import {
    Lock,
    Leaf,
    Package,
    Truck,
    Coffee,
    ShoppingBag,
    User,
    Snowflake,
    LockOpen,
    Camera,
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { WeatherButton } from "@/app/[tenantSlug]/mobile/pos/_components/WeatherButton";

const iconMap: Record<string, LucideIcon> = {
    ice: Snowflake,
    tea: Leaf,
    delivery: Truck,
    package: Package,
    coffee: Coffee,
    shopping: ShoppingBag,
    shift_change: User,
};

interface ShiftEvent {
    time: string;
    icon: string;
    label: string;
}

interface TasksProgressBarProps {
    openTime?: string;
    closeTime?: string;
    currentTime?: string;
    events?: ShiftEvent[];
    onWeatherClick?: () => void;
}

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
    return `${display}\u200A${ampm}`;
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
    return Math.min(
        Math.max(((current - open) / (close - open)) * 100, 0),
        100,
    );
}

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

export default function TasksProgressBar({
    openTime = "10:00",
    closeTime = "22:00",
    currentTime,
    events = [],
    onWeatherClick,
}: TasksProgressBarProps) {
    const progress = getCurrentProgress(openTime, closeTime, currentTime);
    const open = timeToMinutes(openTime);
    const close = timeToMinutes(closeTime);
    const totalMinutes = close - open;
    const scrollRef = useRef<HTMLDivElement>(null);
    const progressMarkerRef = useRef<HTMLDivElement>(null);
    const openIconRef = useRef<HTMLDivElement>(null);
    const closeIconRef = useRef<HTMLDivElement>(null);
    const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [tooltip, setTooltip] = useState<string | null>(null);

    const now = getCurrentMinutes(currentTime);

    const upcomingEvent = events.find((e) => {
        const mins = timeToMinutes(e.time);
        return mins > now && mins - now <= 30;
    });

    const displayTime = currentTime
        ? formatTime(timeToMinutes(currentTime))
        : new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
          });

    const greeting = useMemo(() => getGreeting(), []);

    const BAR_WIDTH = 1200;

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
        const handleScroll = () => setTooltip(null);
        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="overflow-visible">
            {/* Top info — 3 lines */}
            <div className="pb-3 flex items-start justify-between">
                <div>
                    {upcomingEvent ? (
                        <>
                            <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest">
                                Coming up
                            </p>
                            <p className="text-xl font-bold text-gray-900 tracking-tight">
                                {upcomingEvent.label} · in{" "}
                                {timeToMinutes(upcomingEvent.time) - now} min
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-base text-gray-600">
                                    Don&apos;t forget to take a photo
                                </p>
                                <button
                                    disabled
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-400 text-[11px] font-medium cursor-not-allowed"
                                >
                                    <Camera size={11} strokeWidth={2} />
                                    Photo
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                                Right now
                            </p>
                            <p className="text-xl font-bold text-gray-900 tracking-tight">
                                {greeting}
                            </p>
                            <p className="text-base text-gray-600">
                                {formatDate()} · {displayTime}
                            </p>
                        </>
                    )}
                </div>

                {/* Weather button top right */}
                {onWeatherClick && (
                    <div className="shrink-0 ml-3 mt-0.5">
                        <WeatherButton onClick={onWeatherClick} />
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div
                ref={scrollRef}
                className="overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:h-0.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:mx-6"
            >
                <div
                    style={{ width: BAR_WIDTH }}
                    className="relative px-4 py-4 pb-10 mb-0"
                >
                    <div className="relative flex items-center">
                        {/* Open icon */}
                        <div
                            ref={openIconRef}
                            className="absolute -left-4 z-20 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center border-2 border-gray-50 cursor-pointer"
                            onClick={() =>
                                setTooltip(
                                    tooltip === "Store Open"
                                        ? null
                                        : "Store Open",
                                )
                            }
                        >
                            <LockOpen
                                size={22}
                                strokeWidth={2}
                                className="text-white"
                            />
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
                            {Array.from({ length: totalMinutes / 60 }).map(
                                (_, i) => {
                                    const segmentStart =
                                        (i / (totalMinutes / 60)) * 100;
                                    const segmentEnd =
                                        ((i + 1) / (totalMinutes / 60)) * 100;
                                    const isFull = progress >= segmentEnd;
                                    const isPartial =
                                        progress > segmentStart &&
                                        progress < segmentEnd;
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
                                                        width: isFull
                                                            ? "100%"
                                                            : `${fillPct}%`,
                                                    }}
                                                >
                                                    <div className="absolute top-0.5 left-1 right-1 h-0.5 rounded-full bg-white/20" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                },
                            )}
                        </div>

                        {/* Close icon */}
                        <div
                            ref={closeIconRef}
                            className="absolute -right-4 z-20 w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center border-2 border-gray-50 cursor-pointer"
                            onClick={() =>
                                setTooltip(
                                    tooltip === "Store Close"
                                        ? null
                                        : "Store Close",
                                )
                            }
                        >
                            <Lock
                                size={22}
                                strokeWidth={2}
                                className="text-gray-400"
                            />
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

                        {/* Event icons */}
                        {events.map((event) => {
                            const pct =
                                ((timeToMinutes(event.time) - open) /
                                    totalMinutes) *
                                100;
                            const Icon = iconMap[event.icon] ?? Package;
                            const isPassed = progress >= pct;
                            const tooltipKey = `event-${event.time}`;
                            const eventRef: React.RefObject<HTMLDivElement | null> =
                                {
                                    current:
                                        eventRefs.current[event.time] ?? null,
                                };
                            return (
                                <div
                                    key={event.time}
                                    className="absolute z-10"
                                    style={{
                                        left: `${pct}%`,
                                        transform: "translate(-50%, -50%)",
                                        top: "50%",
                                    }}
                                >
                                    <div
                                        ref={(el) => {
                                            eventRefs.current[event.time] = el;
                                        }}
                                        onClick={() =>
                                            setTooltip(
                                                tooltip === tooltipKey
                                                    ? null
                                                    : tooltipKey,
                                            )
                                        }
                                        className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 border-gray-50 transition-colors duration-300 cursor-pointer ${
                                            isPassed
                                                ? "bg-blue-600"
                                                : "bg-gray-200"
                                        }`}
                                    >
                                        <Icon
                                            size={22}
                                            strokeWidth={2}
                                            className={
                                                isPassed
                                                    ? "text-white"
                                                    : "text-gray-400"
                                            }
                                        />
                                    </div>
                                    {tooltip === tooltipKey && (
                                        <TooltipPortal
                                            label={`${event.label} · ${event.time}`}
                                            anchorRef={eventRef}
                                            align="center"
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Time labels */}
                    <div className="relative w-full mt-5 px-0">
                        {Array.from({ length: totalMinutes / 60 + 1 }).map(
                            (_, i) => {
                                if (i === totalMinutes / 60) return null; // skip last
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
                            },
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
