"use client";

import { useEffect, useRef, useMemo } from "react";
import { MessageSquare } from "lucide-react";
import mapboxgl from "mapbox-gl";
import useCustomerFeedbacks from "@/lib/hooks/customer-feedbacks/useCustomerFeedbacks";
import { formatTimeAgo } from "@tea-pos/utils/formatTimeAgo";
import type { CustomerFeedbackResponse } from "@tea-pos/features/customer-feedbacks/schema";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const BOGOR_LNG = 106.8002;
const BOGOR_LAT = -6.5971;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    // Strip timezone offset before passing to formatTimeAgo
    const normalized = dateStr.replace(/\+\d{2}:\d{2}$/, "Z");
    return formatTimeAgo(normalized);
}

// Group feedbacks by approximate location (within ~500m)
function groupByLocation(
    feedbacks: CustomerFeedbackResponse[],
): Map<string, CustomerFeedbackResponse[]> {
    const groups = new Map<string, CustomerFeedbackResponse[]>();
    const PRECISION = 2; // ~1km grid

    feedbacks.forEach((fb) => {
        const key = `${fb.latitude.toFixed(PRECISION)},${fb.longitude.toFixed(PRECISION)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fb);
    });

    return groups;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedbackHistory() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const initializedRef = useRef(false);

    const { data, isLoading } = useCustomerFeedbacks({ limit: 100 });
    const feedbacks = useMemo(() => data?.feedbacks ?? [], [data]);

    const locationCountMap = useMemo(() => {
        const counts = new Map<string, number>();
        const PRECISION = 2;
        feedbacks.forEach((fb) => {
            const key = `${fb.latitude.toFixed(PRECISION)},${fb.longitude.toFixed(PRECISION)}`;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });
        return counts;
    }, [feedbacks]);

    const getLocationCount = (fb: CustomerFeedbackResponse) => {
        const PRECISION = 2;
        const key = `${fb.latitude.toFixed(PRECISION)},${fb.longitude.toFixed(PRECISION)}`;
        return locationCountMap.get(key) ?? 1;
    };

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

        const groups = groupByLocation(feedbacks);

        groups.forEach((group) => {
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
            feedbacks.forEach((fb) =>
                bounds.extend([fb.longitude, fb.latitude]),
            );
            mapRef.current.fitBounds(bounds, {
                padding: 40,
                maxZoom: 14,
                duration: 800,
            });
        } else if (feedbacks.length === 1) {
            mapRef.current.flyTo({
                center: [feedbacks[0].longitude, feedbacks[0].latitude],
                zoom: 13,
                duration: 800,
            });
        }
    }, [feedbacks]);

    return (
        <div className="space-y-4">
            {/* Map */}
            <div className="h-[280px] w-full rounded-2xl overflow-hidden bg-gray-100">
                <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex flex-col gap-2.5">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-24 bg-white rounded-2xl animate-pulse"
                        />
                    ))}
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="bg-white rounded-2xl flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <MessageSquare size={28} className="opacity-50" />
                    <p className="text-sm">No feedback submitted yet</p>
                </div>
            ) : (
                <div className="flex flex-col gap-2.5">
                    {feedbacks.map((fb) => (
                        <button
                            key={fb.id}
                            onClick={() => {
                                mapRef.current?.flyTo({
                                    center: [fb.longitude, fb.latitude],
                                    zoom: 14,
                                    duration: 600,
                                });
                            }}
                            className="w-full bg-white rounded-2xl flex items-start gap-3 px-3 py-3 active:bg-gray-50 text-left"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-lg font-extrabold text-gray-900 leading-snug">
                                        {fb.locationDisplay}
                                    </p>
                                    <span className="text-sm text-gray-400 shrink-0 pt-0.5">
                                        {formatDate(fb.createdAt)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 truncate mt-0.5">{fb.locationName}</p>
                                <span className="inline-block bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full mt-1.5">
                                    {getLocationCount(fb)} votes
                                </span>
                                <div className="mt-2 space-y-1">
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
            )}
        </div>
    );
}
