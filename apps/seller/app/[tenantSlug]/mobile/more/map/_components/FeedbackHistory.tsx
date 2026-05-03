"use client";

import { useEffect, useRef, useMemo } from "react";
import { MapPin, MessageSquare } from "lucide-react";
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
            const isCluster = count > 1;

            const el = document.createElement("div");
            el.style.cssText = `
                min-width: 28px;
                height: 28px;
                padding: 0 6px;
                background: var(--brand, #3b82f6);
                border: 2.5px solid white;
                border-radius: ${isCluster ? "14px" : "50%"};
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

            el.innerHTML = isCluster
                ? `${count}`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;

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
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-16 bg-white rounded-2xl animate-pulse"
                        />
                    ))}
                </div>
            ) : feedbacks.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <MessageSquare size={28} className="opacity-50" />
                    <p className="text-sm">No feedback submitted yet</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
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
                            className="w-full bg-white rounded-2xl shadow-sm flex items-start gap-3 px-4 py-3 active:bg-gray-50 text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                                <MapPin size={14} className="text-brand" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {fb.locationDisplay}
                                    </p>
                                    <span className="text-xs text-gray-400 shrink-0">
                                        {formatDate(fb.createdAt)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">
                                    {fb.userName ?? "Unknown"}
                                    {fb.notes ? ` · ${fb.notes}` : ""}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
