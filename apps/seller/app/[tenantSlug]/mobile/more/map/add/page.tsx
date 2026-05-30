"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, MapPin, Loader2 } from "lucide-react";
import { FormFooter } from "@/components/shared/FormFooter";
import useCreateCustomerFeedback from "@/lib/hooks/customer-feedbacks/useCreateCustomerFeedback";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const BOGOR_LNG = 106.8002;
const BOGOR_LAT = -6.5971;
const BOGOR_ZOOM = 11;

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

async function searchLocations(query: string): Promise<MapboxFeature[]> {
    if (!query.trim()) return [];
    const params = new URLSearchParams({
        access_token: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
        proximity: `${BOGOR_LNG},${BOGOR_LAT}`,
        country: "ID",
        language: "id",
        limit: "6",
        types: "place,locality,neighborhood,address",
        bbox: "95.0,-11.0,141.0,6.0",
    });
    const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.features ?? [];
}

function MiniMap({ lng, lat, shouldFly }: { lng: number; lat: number; shouldFly: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markerRef = useRef<mapboxgl.Marker | null>(null);
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
            markerRef.current?.remove();
            markerRef.current = null;
            mapRef.current?.remove();
            mapRef.current = null;
            initializedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;
        if (!shouldFly) {
            markerRef.current?.remove();
            markerRef.current = null;
            return;
        }
        if (markerRef.current) {
            markerRef.current.setLngLat([lng, lat]);
        } else {
            markerRef.current = new mapboxgl.Marker({ color: "#3b82f6" })
                .setLngLat([lng, lat])
                .addTo(mapRef.current);
        }
        mapRef.current.flyTo({ center: [lng, lat], zoom: 13, duration: 1200, essential: true });
    }, [lng, lat, shouldFly]);

    return <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />;
}

export default function AddLocationFeedbackPage() {
    const router = useRouter();
    const { submit, isLoading, reset } = useCreateCustomerFeedback();

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
    const [notes, setNotes] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleQueryChange = (value: string) => {
        setQuery(value);
        setSelectedLocation(null);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!value.trim()) { setSuggestions([]); return; }
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

    const handleSubmit = useCallback(async () => {
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
            reset();
            router.back();
        } else {
            toast.error("Failed to submit. Please try again.");
        }
    }, [selectedLocation, notes, submit, reset, router]);

    return (
        <div className="space-y-3 pb-4">
            {/* Map */}
            <div className="h-44 w-full rounded-xl overflow-hidden">
                <MiniMap
                    lng={selectedLocation?.longitude ?? BOGOR_LNG}
                    lat={selectedLocation?.latitude ?? BOGOR_LAT}
                    shouldFly={!!selectedLocation}
                />
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl p-4 space-y-4">
                {/* Location Search */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                    <div className="relative">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-3 border border-gray-100">
                            {isFetching ? (
                                <Loader2 size={20} className="text-gray-400 shrink-0 animate-spin" />
                            ) : (
                                <Search size={20} className="text-gray-400 shrink-0" />
                            )}
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => handleQueryChange(e.target.value)}
                                placeholder="Search area or district..."
                                className="flex-1 bg-transparent text-base text-gray-800 placeholder:text-gray-400 focus:outline-none"
                            />
                            {query.length > 0 && (
                                <button onClick={() => { setQuery(""); setSuggestions([]); setSelectedLocation(null); }}>
                                    <X size={20} className="text-gray-400" />
                                </button>
                            )}
                        </div>
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                                {suggestions.map((feature) => (
                                    <button
                                        key={feature.id}
                                        onClick={() => handleSelectSuggestion(feature)}
                                        className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100 border-b border-gray-100 last:border-none"
                                    >
                                        <MapPin size={18} className="text-brand shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{feature.text}</p>
                                            <p className="text-xs text-gray-500 truncate">{feature.place_name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any observations? (optional)"
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-3 text-base text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/90 resize-none"
                    />
                </div>
            </div>

            <FormFooter
                label="Submit Feedback"
                loadingLabel="Submitting..."
                onSubmit={handleSubmit}
                disabled={!selectedLocation}
                isLoading={isLoading}
            />
        </div>
    );
}
