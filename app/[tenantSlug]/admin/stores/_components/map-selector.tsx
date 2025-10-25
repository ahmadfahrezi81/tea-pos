/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L, { LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icon paths for Next.js bundling
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

(L as any).Marker.prototype.options.icon = L.icon({
    iconUrl: (markerIcon as any).src ?? markerIcon,
    shadowUrl: (markerShadow as any).src ?? markerShadow,
});

interface SearchResult {
    display_name: string;
    lat: string;
    lon: string;
}

interface MapSelectorProps {
    position: [number, number] | null;
    onSelect: (lat: number, lng: number) => void;
}

export function MapSelector({ position, onSelect }: MapSelectorProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [selected, setSelected] = useState<[number, number] | null>(position);
    const [shouldZoomIn, setShouldZoomIn] = useState(false);

    useEffect(() => {
        setSelected(position);
    }, [position]);

    // 🧭 Map click handler
    function LocationPicker() {
        useMapEvents({
            click(e: LeafletMouseEvent) {
                const { lat, lng } = e.latlng;
                setSelected([lat, lng]);
                setShouldZoomIn(false); // preserve current zoom on manual click
                onSelect(lat, lng);
            },
        });
        return null;
    }

    // 🎯 Recenter map when a new location is chosen
    function RecenterMap({
        lat,
        lng,
        zoomIn,
    }: {
        lat: number;
        lng: number;
        zoomIn: boolean;
    }) {
        const map = useMap();
        useEffect(() => {
            const targetZoom = zoomIn
                ? Math.max(map.getZoom(), 15)
                : map.getZoom();
            map.flyTo([lat, lng], targetZoom, { animate: true, duration: 1.2 });
        }, [lat, lng, zoomIn, map]);
        return null;
    }

    // 🌍 Nominatim search
    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q) return;

        setIsSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
                    q
                )}`
            );
            const data: SearchResult[] = await res.json();
            setSearchResults(data.slice(0, 5));
        } catch (err) {
            console.error("Nominatim search error:", err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    // 📍 When user selects a search result
    const handleSelectResult = (lat: string, lon: string) => {
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        setSelected([latNum, lonNum]);
        onSelect(latNum, lonNum);
        setSearchResults([]);
        setSearchQuery("");
        setShouldZoomIn(true); // trigger zoom
    };

    // ⌨️ Handle Enter key to trigger search
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleSearch();
        }
    };

    return (
        <div className="space-y-2">
            {/* 🔍 Search bar */}
            <div className="flex gap-2">
                <input
                    type="text"
                    aria-label="Search location"
                    placeholder="Search for a place (city, country, address)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="px-3 py-2 text-sm bg-primary text-white rounded-md disabled:opacity-50"
                >
                    {isSearching ? "Searching..." : "Search"}
                </button>
            </div>

            {/* 📋 Results dropdown */}
            {searchResults.length > 0 && (
                <ul className="bg-popover border rounded-md shadow-sm text-sm max-h-40 overflow-y-auto">
                    {searchResults.map((r, idx) => (
                        <li
                            key={idx}
                            onClick={() => handleSelectResult(r.lat, r.lon)}
                            className="px-3 py-2 hover:bg-accent cursor-pointer"
                        >
                            {r.display_name}
                        </li>
                    ))}
                </ul>
            )}

            {/* 🗺️ Map */}
            <div className="h-[300px] w-full rounded-md overflow-hidden border relative z-0">
                <MapContainer
                    center={selected ?? [0, 0]}
                    zoom={selected ? 13 : 2}
                    style={{ height: "100%", width: "100%" }}
                    className="z-0"
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
                    />
                    <LocationPicker />
                    {selected && <Marker position={selected} />}
                    {selected && (
                        <RecenterMap
                            lat={selected[0]}
                            lng={selected[1]}
                            zoomIn={shouldZoomIn}
                        />
                    )}
                </MapContainer>
            </div>

            {selected && (
                <p className="text-xs text-muted-foreground">
                    Lat: {selected[0].toFixed(6)}, Lng: {selected[1].toFixed(6)}
                </p>
            )}
        </div>
    );
}
