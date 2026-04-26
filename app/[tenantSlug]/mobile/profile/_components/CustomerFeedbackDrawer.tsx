"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Drawer } from "vaul";
import { X, MapPin, Search, Loader2, History } from "lucide-react";
import useCreateCustomerFeedback from "@/lib/client/hooks/customer-feedbacks/useCreateCustomerFeedback";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import { navigation } from "@/lib/shared/utils/navigation";
import { useTenantSlug } from "@/lib/server/config/tenant-url";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

// ─── Constants ────────────────────────────────────────────────────────────────

const BOGOR_LNG = 106.8002;
const BOGOR_LAT = -6.5971;
const BOGOR_ZOOM = 11;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MapboxFeature {
    id: string;
    place_name: string;
    text: string;
    center: [number, number];
}

interface SelectedLocation {
    locationName: string;
    locationDisplay: string;
    latitude: number;
    longitude: number;
}

interface CustomerFeedbackDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Mapbox geocoding helper ──────────────────────────────────────────────────

async function searchLocations(query: string): Promise<MapboxFeature[]> {
    if (!query.trim()) return [];

    const params = new URLSearchParams({
        access_token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
        proximity: `${BOGOR_LNG},${BOGOR_LAT}`,
        country: "ID",
        language: "id",
        limit: "5",
        types: "district,place,locality,neighborhood",
    });

    const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`,
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
}

// ─── Mini Map ─────────────────────────────────────────────────────────────────

function MiniMap({
    lng,
    lat,
    shouldFly,
}: {
    lng: number;
    lat: number;
    shouldFly: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!containerRef.current || initializedRef.current) return;
        initializedRef.current = true;

        mapRef.current = new mapboxgl.Map({
            container: containerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [BOGOR_LNG, BOGOR_LAT],
            zoom: BOGOR_ZOOM,
            interactive: false,
            attributionControl: false,
        });

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
            initializedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current || !shouldFly) return;
        mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 13,
            duration: 1200,
            essential: true,
        });
    }, [lng, lat, shouldFly]);

    return (
        <div
            ref={containerRef}
            className="w-full h-full rounded-xl overflow-hidden"
        />
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerFeedbackDrawer({
    isOpen,
    onClose,
}: CustomerFeedbackDrawerProps) {
    const { submit, isLoading, reset } = useCreateCustomerFeedback();
    const { url } = useTenantSlug();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [selectedLocation, setSelectedLocation] =
        useState<SelectedLocation | null>(null);
    const [notes, setNotes] = useState("");

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleClose = useCallback(() => {
        setQuery("");
        setSuggestions([]);
        setSelectedLocation(null);
        setNotes("");
        reset();
        onClose();
    }, [onClose, reset]);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setSelectedLocation(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!value.trim()) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setIsFetching(true);
            const results = await searchLocations(value);
            setSuggestions(results);
            setIsFetching(false);
        }, 350);
    };

    const handleSelectSuggestion = (feature: MapboxFeature) => {
        const [lng, lat] = feature.center;
        setSelectedLocation({
            locationName: feature.place_name,
            locationDisplay: feature.text,
            latitude: lat,
            longitude: lng,
        });
        setQuery(feature.place_name);
        setSuggestions([]);
    };

    const handleSubmit = async () => {
        if (!selectedLocation) return;

        const result = await submit({
            locationName: selectedLocation.locationName,
            locationDisplay: selectedLocation.locationDisplay,
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            notes: notes.trim() || null,
        });

        if (result?.success) {
            toast.success("Feedback submitted!");
            handleClose();
        } else {
            toast.error("Failed to submit. Please try again.");
        }
    };

    const canSubmit = !!selectedLocation && !isLoading;

    return (
        <Drawer.Root
            open={isOpen}
            dismissible={false}
            repositionInputs={false}
            onOpenChange={(open) => !open && handleClose()}
        >
            <Drawer.Portal>
                <Drawer.Overlay
                    className="fixed inset-0 bg-black/60 z-50"
                    onClick={handleClose}
                />
                <Drawer.Content
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl focus:outline-none flex flex-col"
                    style={{ height: "auto" }}
                >
                    {/* Header — cart style */}
                    <div className="shrink-0 px-4 pt-4 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleClose}
                                    className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -ml-2"
                                >
                                    <X size={24} />
                                </button>
                                <Drawer.Title className="text-xl font-bold text-gray-900">
                                    New Location Survey
                                </Drawer.Title>
                            </div>
                            <button
                                onClick={() => {
                                    handleClose();
                                    navigation.push(url("/mobile/profile/map"));
                                }}
                                className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                            >
                                <History size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Mini Map */}
                    <div className="shrink-0 h-[180px] w-full px-4 mb-3">
                        <MiniMap
                            lng={selectedLocation?.longitude ?? BOGOR_LNG}
                            lat={selectedLocation?.latitude ?? BOGOR_LAT}
                            shouldFly={!!selectedLocation}
                        />
                    </div>

                    {/* Inputs */}
                    <div className="flex flex-col gap-3 px-4 pb-6 pt-1">
                        {/* Location Search */}
                        <div className="relative">
                            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-3 border border-gray-100">
                                {isFetching ? (
                                    <Loader2
                                        size={22}
                                        className="text-gray-400 shrink-0 animate-spin"
                                    />
                                ) : (
                                    <Search
                                        size={22}
                                        className="text-gray-400 shrink-0"
                                    />
                                )}
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) =>
                                        handleQueryChange(e.target.value)
                                    }
                                    placeholder="Search area or district..."
                                    className="flex-1 bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
                                />
                                {query.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setQuery("");
                                            setSuggestions([]);
                                            setSelectedLocation(null);
                                        }}
                                        className="text-gray-700"
                                    >
                                        <X size={22} />
                                    </button>
                                )}
                            </div>

                            {/* Suggestions — opens upward */}
                            {suggestions.length > 0 && (
                                <div className="absolute bottom-full left-0 right-0 z-10 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                    {suggestions.map((feature) => (
                                        <button
                                            key={feature.id}
                                            onClick={() =>
                                                handleSelectSuggestion(feature)
                                            }
                                            className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-none"
                                        >
                                            <MapPin
                                                size={20}
                                                className="text-brand shrink-0 mt-0.5"
                                            />
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {feature.text}
                                                </p>
                                                <p className="text-xs text-gray-600 truncate">
                                                    {feature.place_name}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes (optional)..."
                            rows={3}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 text-[16px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/90 resize-none"
                        />

                        {/* Submit */}
                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className="w-full bg-brand text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
                        >
                            {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                "Submit Feedback"
                            )}
                        </button>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
