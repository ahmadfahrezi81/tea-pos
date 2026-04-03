"use client";

import { useMemo } from "react";
import { Drawer } from "vaul";
import { Cloud, X } from "lucide-react";
import { getWeatherMeta } from "@/lib/utils/weatherCode";
import useWeather from "@/lib/hooks/weather/useWeather";
import { getCurrentLocalHour } from "@/lib/utils/time";

import { Bebas_Neue } from "next/font/google";

const bebas = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bebas",
});

const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

function formatHour(hour: number): string {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${period}`;
}

function formatFetchedAt(utcTime: string): string {
    const date = new Date(utcTime);
    const localHour = (date.getUTCHours() + TZ_OFFSET) % 24;
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const period = localHour >= 12 ? "pm" : "am";
    const hour12 = localHour % 12 === 0 ? 12 : localHour % 12;
    return `${hour12}:${minutes}${period}`;
}

interface WeatherDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WeatherDrawer({ isOpen, onClose }: WeatherDrawerProps) {
    const { data, isLoading } = useWeather();

    // Not memoized — cheap call, and needs to be fresh on every render
    const currentLocalHour = getCurrentLocalHour();

    const visibleHours = useMemo(() => {
        if (!data?.hourly) return [];
        return data.hourly.filter(
            (h) =>
                h.hour >= currentLocalHour - 1 &&
                h.hour <= currentLocalHour + 7,
        );
    }, [data?.hourly, currentLocalHour]);

    // "As of" time — use current hour's fetchedAt, not the first in the array
    const currentHourData = data?.hourly?.find(
        (h) => h.hour === currentLocalHour,
    );

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl px-4 pt-5 pb-10 focus:outline-none max-h-[90dvh] overflow-y-auto">
                    {/* Pull tab */}
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

                    {/* Header */}
                    <div
                        className={`flex items-center justify-between mb-3 ${bebas.variable}`}
                    >
                        <div>
                            <Drawer.Title className="font-bebas text-2xl font-light text-gray-900">
                                {data?.city ?? "Ciomas"},{" "}
                                {data?.region ?? "Bogor"}
                            </Drawer.Title>
                            <p className="font-bebas text-lg text-gray-500 -mt-2">
                                As of{" "}
                                {currentHourData?.fetchedAt
                                    ? formatFetchedAt(currentHourData.fetchedAt)
                                    : "—"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-gray-900 hover:bg-gray-100 -mr-2"
                        >
                            <X size={26} />
                        </button>
                    </div>

                    {/* Loading */}
                    {isLoading && (
                        <div className="space-y-3">
                            <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
                            <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
                        </div>
                    )}

                    {/* Empty */}
                    {!isLoading && !data && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Cloud className="w-10 h-10 mb-3" />
                            <p className="text-sm">No weather data available</p>
                        </div>
                    )}

                    {/* Content */}
                    {!isLoading && data && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                {visibleHours.map((hour) => {
                                    const isCurrent =
                                        hour.hour === currentLocalHour;
                                    const isPast = hour.hour < currentLocalHour;
                                    const { lucideIcon: WeatherIcon, label } =
                                        getWeatherMeta(hour.weatherCode);

                                    return (
                                        <div
                                            key={hour.hour}
                                            className={`flex items-center justify-between px-4 py-3 pl-3 rounded-xl transition-opacity ${
                                                isPast
                                                    ? "opacity-30 bg-gray-50"
                                                    : isCurrent
                                                      ? "bg-blue-50"
                                                      : "bg-gray-50"
                                            }`}
                                        >
                                            <p
                                                className={`font-semibold w-16 ${isCurrent ? "text-base text-blue-500" : "text-sm text-gray-800"}`}
                                            >
                                                {isCurrent
                                                    ? "Now"
                                                    : formatHour(hour.hour)}
                                            </p>

                                            <div className="flex items-center gap-1.5 flex-1">
                                                <WeatherIcon
                                                    size={26}
                                                    className="text-gray-900"
                                                />
                                                <p className="text-md text-gray-600 font-medium">
                                                    {label}
                                                </p>
                                            </div>

                                            {hour.precipitationProbability >
                                                0 && (
                                                <div className="flex items-center gap-1 w-14 justify-end">
                                                    <p className="text-xs font-bold text-white bg-cyan-400 rounded-sm px-1 py-0.5">
                                                        {
                                                            hour.precipitationProbability
                                                        }
                                                        %
                                                    </p>
                                                </div>
                                            )}

                                            <p className="text-sm font-semibold text-gray-900 w-11 text-right">
                                                {hour.temperature}°C
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
