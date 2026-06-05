"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { MessageSquare, Search, SlidersHorizontal, X, Check } from "lucide-react";
import { Drawer } from "vaul";
import mapboxgl from "mapbox-gl";
import useCustomerFeedbacks from "@/lib/hooks/customer-feedbacks/useCustomerFeedbacks";
import { formatTimeAgo } from "@tea-pos/utils/formatTimeAgo";
import type { CustomerFeedbackResponse } from "@tea-pos/features/customer-feedbacks/schema";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const BOGOR_LNG = 106.8002;
const BOGOR_LAT = -6.5971;
const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

type DateRange = "all" | "today" | "week" | "month";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    // Strip timezone offset before passing to formatTimeAgo
    const normalized = dateStr.replace(/\+\d{2}:\d{2}$/, "Z");
    return formatTimeAgo(normalized);
}

function getLocalDateKey(dateStr: string): string {
    const utc = new Date(dateStr.replace(/\+\d{2}:\d{2}$/, "Z"));
    const local = new Date(utc.getTime() + TZ_OFFSET * 60 * 60 * 1000);
    return local.toISOString().split("T")[0];
}

function formatDayLabel(dateKey: string): string {
    const now = new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000);
    const today = now.toISOString().split("T")[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];
    if (dateKey === today) return "Today";
    if (dateKey === yesterday) return "Yesterday";
    return new Date(dateKey).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function groupByDay(feedbacks: CustomerFeedbackResponse[]): { dateKey: string; items: CustomerFeedbackResponse[] }[] {
    const map = new Map<string, CustomerFeedbackResponse[]>();
    feedbacks.forEach((fb) => {
        const key = getLocalDateKey(fb.createdAt);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(fb);
    });
    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([dateKey, items]) => ({ dateKey, items }));
}

function groupByLocation(
    feedbacks: CustomerFeedbackResponse[],
): Map<string, CustomerFeedbackResponse[]> {
    const groups = new Map<string, CustomerFeedbackResponse[]>();
    feedbacks.forEach((fb) => {
        const key = `${fb.latitude.toFixed(2)},${fb.longitude.toFixed(2)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fb);
    });
    return groups;
}

function getDateRangeCutoff(range: DateRange): Date | null {
    const now = new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000);
    const todayStart = new Date(`${now.toISOString().split("T")[0]}T00:00:00Z`);
    if (range === "today") return todayStart;
    if (range === "week") return new Date(todayStart.getTime() - 6 * 86400000);
    if (range === "month") return new Date(todayStart.getTime() - 29 * 86400000);
    return null;
}

// ─── Filter Drawer ────────────────────────────────────────────────────────────

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "week", label: "Last 7 days" },
    { value: "month", label: "Last 30 days" },
];

function FilterDrawer({
    isOpen,
    onClose,
    dateRange,
    onDateRangeChange,
    selectedUsers,
    onUsersChange,
    allUsers,
}: {
    isOpen: boolean;
    onClose: () => void;
    dateRange: DateRange;
    onDateRangeChange: (v: DateRange) => void;
    selectedUsers: string[];
    onUsersChange: (v: string[]) => void;
    allUsers: string[];
}) {
    const toggleUser = (user: string) => {
        onUsersChange(
            selectedUsers.includes(user)
                ? selectedUsers.filter((u) => u !== user)
                : [...selectedUsers, user],
        );
    };

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl px-4 pt-5 pb-10 focus:outline-none">
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

                    <div className="flex items-center justify-between mb-5">
                        <Drawer.Title className="text-lg font-bold text-gray-900">Filter</Drawer.Title>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Date Range</p>
                    <div className="flex flex-col gap-1 mb-5">
                        {DATE_RANGE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => onDateRangeChange(opt.value)}
                                className="flex items-center justify-between px-3 py-3 rounded-xl active:bg-gray-50"
                            >
                                <span className={`text-[15px] font-medium ${dateRange === opt.value ? "text-brand" : "text-gray-800"}`}>
                                    {opt.label}
                                </span>
                                {dateRange === opt.value && <Check size={16} className="text-brand" />}
                            </button>
                        ))}
                    </div>

                    {allUsers.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Submitted By</p>
                            <div className="flex flex-col gap-1">
                                {allUsers.map((user) => {
                                    const active = selectedUsers.includes(user);
                                    return (
                                        <button
                                            key={user}
                                            onClick={() => toggleUser(user)}
                                            className="flex items-center justify-between px-3 py-3 rounded-xl active:bg-gray-50"
                                        >
                                            <span className={`text-[15px] font-medium ${active ? "text-brand" : "text-gray-800"}`}>
                                                {user}
                                            </span>
                                            {active && <Check size={16} className="text-brand" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackHistory() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const initializedRef = useRef(false);

    const [query, setQuery] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>("all");
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const { data, isLoading } = useCustomerFeedbacks({ limit: 100 });
    const feedbacks = useMemo(() => data?.feedbacks ?? [], [data]);

    const allUsers = useMemo(() => {
        const names = feedbacks.map((fb) => fb.userName ?? "Unknown");
        return Array.from(new Set(names)).sort();
    }, [feedbacks]);

    const filtered = useMemo(() => {
        const cutoff = getDateRangeCutoff(dateRange);
        const q = query.trim().toLowerCase();
        return feedbacks.filter((fb) => {
            if (cutoff) {
                const fbDate = new Date(fb.createdAt.replace(/\+\d{2}:\d{2}$/, "Z"));
                if (fbDate < cutoff) return false;
            }
            if (selectedUsers.length > 0 && !selectedUsers.includes(fb.userName ?? "Unknown")) return false;
            if (q) {
                const haystack = [fb.locationDisplay, fb.locationName, fb.userName, fb.notes]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [feedbacks, dateRange, selectedUsers, query]);

    const locationGroups = useMemo(() => groupByLocation(feedbacks), [feedbacks]);

    const getLocationCount = (fb: CustomerFeedbackResponse) => {
        const key = `${fb.latitude.toFixed(2)},${fb.longitude.toFixed(2)}`;
        return locationGroups.get(key)?.length ?? 1;
    };

    const activeFilterCount = (dateRange !== "all" ? 1 : 0) + selectedUsers.length;

    // ── Init map ──────────────────────────────────────────────────────

    useEffect(() => {
        if (!mapContainerRef.current || initializedRef.current) return;
        initializedRef.current = true;

        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [BOGOR_LNG, BOGOR_LAT],
            zoom: 11,
            attributionControl: false,
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            initializedRef.current = false;
        };
    }, []);

    // ── Add markers ───────────────────────────────────────────────────

    useEffect(() => {
        if (!mapRef.current || feedbacks.length === 0) return;

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        locationGroups.forEach((group) => {
            const representative = group[0];
            const count = group.length;

            const el = document.createElement("div");
            el.style.cssText = `
                min-width: 28px;
                height: 28px;
                padding: 0 6px;
                background: var(--brand, #3b82f6);
                border: 2.5px solid white;
                border-radius: 14px;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 700;
                color: white;
                font-family: system-ui, sans-serif;
            `;
            el.innerHTML = `${count}`;

            const marker = new mapboxgl.Marker(el)
                .setLngLat([representative.longitude, representative.latitude])
                .addTo(mapRef.current!);

            markersRef.current.push(marker);
        });

        if (feedbacks.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            feedbacks.forEach((fb) => bounds.extend([fb.longitude, fb.latitude]));
            mapRef.current.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 800 });
        } else if (feedbacks.length === 1) {
            mapRef.current.flyTo({ center: [feedbacks[0].longitude, feedbacks[0].latitude], zoom: 13, duration: 800 });
        }
    }, [locationGroups, feedbacks]);

    return (
        <div className="flex flex-col h-full gap-3">
            {/* Map — fixed, doesn't scroll */}
            <div className="shrink-0 h-[220px] w-full rounded-2xl overflow-hidden bg-gray-100">
                <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* Search + Filter */}
            {!isLoading && feedbacks.length > 0 && (
                <div className="shrink-0 flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-3 py-2.5">
                        <Search size={16} className="text-gray-400 shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search feedback..."
                            className="flex-1 text-base text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="text-gray-400">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="relative flex items-center justify-center w-11 bg-white rounded-xl active:bg-gray-50"
                    >
                        <SlidersHorizontal size={18} className={activeFilterCount > 0 ? "text-brand" : "text-gray-500"} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            )}

            {/* List — only this scrolls */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col gap-2.5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : feedbacks.length === 0 ? (
                    <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                        <MessageSquare size={28} className="opacity-50" />
                        <p className="text-sm">No feedback submitted yet</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                        <Search size={28} className="opacity-50" />
                        <p className="text-sm">No results found</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 pb-2">
                        {groupByDay(filtered).map(({ dateKey, items }) => (
                            <div key={dateKey}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
                                    {formatDayLabel(dateKey)}
                                </p>
                                <div className="flex flex-col gap-2.5">
                                    {items.map((fb) => (
                                        <button
                                            key={fb.id}
                                            onClick={() => {
                                                mapRef.current?.flyTo({
                                                    center: [fb.longitude, fb.latitude],
                                                    zoom: 14,
                                                    duration: 600,
                                                });
                                            }}
                                            className="w-full bg-white rounded-2xl flex items-start gap-3 px-3 py-2.5 active:bg-gray-50 text-left"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <p className="text-lg font-extrabold text-gray-900 leading-snug truncate">
                                                            {fb.locationDisplay}
                                                        </p>
                                                        <span className="shrink-0 bg-brand text-white text-xs font-bold px-1.5 py-0 rounded-full">
                                                            {getLocationCount(fb)} {getLocationCount(fb) === 1 ? "vote" : "votes"}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-gray-400 shrink-0 pt-0.5">
                                                        {formatDate(fb.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400 truncate mt-0.5">{fb.locationName}</p>
                                                <div className="mt-1 space-y-1">
                                                    <p className="text-sm text-gray-500">
                                                        <span className="font-semibold text-gray-700">Submitted by </span>
                                                        {fb.userName ?? "Unknown"}
                                                    </p>
                                                    {fb.notes && (
                                                        <>
                                                            <p className="text-sm text-gray-500">
                                                                <span className="font-semibold text-gray-700">Notes</span>
                                                            </p>
                                                            <div className="bg-slate-100 rounded-lg px-3 py-2">
                                                                <p className="text-sm text-gray-600 leading-relaxed">{fb.notes}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                selectedUsers={selectedUsers}
                onUsersChange={setSelectedUsers}
                allUsers={allUsers}
            />
        </div>
    );
}
