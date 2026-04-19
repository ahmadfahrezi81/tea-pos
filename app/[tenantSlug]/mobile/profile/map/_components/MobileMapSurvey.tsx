"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Drawer } from "vaul";
import { MapPin, X, Navigation, Star, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTenantSlug } from "@/lib/server/config/tenant-url";

mapboxgl.accessToken =
    "pk.eyJ1IjoiYWhtYWRmYWhyZXppIiwiYSI6ImNtbzV2ODJpYzF1OTUyc29mYno2MmZ6MGkifQ.0FRmfo_M3OXHCOHJmrBRDQ";

export default function MobileMapSurvey() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const router = useRouter();
    const { url } = useTenantSlug();

    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [106.7942, -6.5944],
            zoom: 14,
        });
    }, []);

    return (
        <div className="-mx-4 -mt-0 -mb-28" style={{ height: "100dvh" }}>
            {/* Map */}
            <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

            {/* Floating search bar */}
            <div className="absolute top-4 left-4 right-4 z-40">
                <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-lg">
                    <button
                        onClick={() => router.push(url("/mobile/profile"))}
                        className="shrink-0 active:scale-95 transition-transform"
                        aria-label="Close"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                    <input
                        type="text"
                        placeholder="Search location..."
                        className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent outline-none"
                    />
                </div>
            </div>

            {/* Fixed half-sheet */}
            <Drawer.Root open={true} dismissible={false} modal={false}>
                <Drawer.Portal>
                    <Drawer.Content
                        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl focus:outline-none flex flex-col"
                        style={{
                            height: "42vh",
                            boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
                        }}
                    >
                        <Drawer.Title className="sr-only">
                            Select Location
                        </Drawer.Title>

                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-gray-300" />
                        </div>

                        {/* Sheet header */}
                        <div className="px-4 pt-2 pb-3 shrink-0 border-b border-gray-100">
                            <p className="text-base font-bold text-gray-900">
                                Choose a location
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Tap the map or select from the list below
                            </p>
                        </div>

                        {/* Scrollable list */}
                        <div className="flex-1 overflow-y-auto px-4">
                            {/* Current location */}
                            <button className="w-full flex items-center gap-3 py-3 border-b border-gray-100 active:bg-gray-50">
                                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                    <Navigation
                                        size={16}
                                        className="text-blue-500"
                                    />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900">
                                        Use current location
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Depok, West Java
                                    </p>
                                </div>
                            </button>

                            {/* Recent */}
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">
                                Recent
                            </p>
                            {[
                                {
                                    name: "Toko Mawar",
                                    address: "Jl. Raya Bogor No.12",
                                },
                                {
                                    name: "Pasar Cisalak",
                                    address: "Jl. Cisalak Raya, Depok",
                                },
                            ].map((place) => (
                                <button
                                    key={place.name}
                                    className="w-full flex items-center gap-3 py-3 border-b border-gray-100 active:bg-gray-50"
                                >
                                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                                        <Clock
                                            size={16}
                                            className="text-gray-500"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {place.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {place.address}
                                        </p>
                                    </div>
                                </button>
                            ))}

                            {/* Saved */}
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-1">
                                Saved
                            </p>
                            {[
                                {
                                    name: "Gudang Utama",
                                    address: "Jl. Margonda Raya No.45",
                                },
                                {
                                    name: "Kantor Pusat",
                                    address: "Jl. TB Simatupang, Jakarta",
                                },
                                {
                                    name: "Toko Cabang 2",
                                    address: "Jl. Sawangan No.8, Depok",
                                },
                            ].map((place) => (
                                <button
                                    key={place.name}
                                    className="w-full flex items-center gap-3 py-3 border-b border-gray-100 active:bg-gray-50"
                                >
                                    <div className="w-9 h-9 bg-yellow-50 rounded-full flex items-center justify-center shrink-0">
                                        <Star
                                            size={16}
                                            className="text-yellow-500"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {place.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {place.address}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Confirm button */}
                        <div className="shrink-0 px-4 py-4 border-t border-gray-100">
                            <button className="w-full bg-brand text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
                                <MapPin size={16} />
                                Confirm Location
                            </button>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    );
}
