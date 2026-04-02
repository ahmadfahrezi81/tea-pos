"use client";

import { useMemo } from "react";
import { Drawer } from "vaul";
import { Cloud, X } from "lucide-react";
import { Bebas_Neue } from "next/font/google";
import { format } from "date-fns";
import { getWeatherMeta } from "@/lib/utils/weatherCode";
import useNotifications from "@/lib/hooks/notifications/useNotifications";

const bebas = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bebas",
});

const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

function getCurrentLocalHour(): number {
    return (new Date().getUTCHours() + TZ_OFFSET) % 24;
}

function formatHour(utcTime: string): string {
    const localHour = (new Date(utcTime).getUTCHours() + TZ_OFFSET) % 24;
    const period = localHour >= 12 ? "PM" : "AM";
    const hour12 = localHour % 12 === 0 ? 12 : localHour % 12;
    return `${hour12} ${period}`;
}

function getLocalHour(utcTime: string): number {
    return (new Date(utcTime).getUTCHours() + TZ_OFFSET) % 24;
}

interface HourlyWeather {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
}

interface WeatherMetadata {
    slot: string;
    hourly: HourlyWeather[];
    location: { lat: number; lng: number; city: string; region: string };
    tempMax: number;
    tempMin: number;
    windowTo: number;
    windowFrom: number;
    forecastDate: string;
    maxRainProbability: number;
}

interface WeatherDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WeatherDrawer({ isOpen, onClose }: WeatherDrawerProps) {
    const { data, isLoading } = useNotifications({ type: "weather_forecast" });

    const latestNotification = data?.notifications[0];
    const metadata = latestNotification?.metadata as WeatherMetadata | null;
    const hourly = metadata?.hourly ?? [];
    const location = metadata?.location;

    const currentLocalHour = useMemo(() => getCurrentLocalHour(), []);

    const currentHour = useMemo(() => {
        if (!hourly.length) return null;
        return (
            hourly.find((h) => getLocalHour(h.time) === currentLocalHour) ??
            hourly[0]
        );
    }, [hourly, currentLocalHour]);

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-gray-50 rounded-t-2xl px-4 pt-4 pb-10 focus:outline-none max-h-[90dvh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <Drawer.Title className="text-xl font-bold text-gray-900">
                                {location?.city ?? "Ciomas"},{" "}
                                {location?.region ?? "Bogor"}
                            </Drawer.Title>
                            <p className="text-xs text-gray-400">
                                As of{" "}
                                {metadata?.forecastDate
                                    ? format(
                                          new Date(metadata.forecastDate),
                                          "EEE, MMM d",
                                      )
                                    : "3:30 AM"}
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
                    {!isLoading && !metadata && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Cloud className="w-10 h-10 mb-3" />
                            <p className="text-sm">No weather data available</p>
                        </div>
                    )}

                    {/* Content */}
                    {!isLoading && metadata && (
                        <div className="space-y-4">
                            {/* Current hour hero */}
                            {currentHour && (
                                <div className="flex items-center justify-between -mb-2">
                                    <div
                                        className={`flex items-center gap-2 ${bebas.variable}`}
                                    >
                                        <p className="font-bebas text-8xl text-blue-600 tracking-tight">
                                            {currentHour.temperature}
                                        </p>
                                        <div className="items-start self-start pt-2 font-bebas">
                                            <div className="-space-y-2.5">
                                                {location && (
                                                    <p className="text-xl text-gray-600 uppercase">
                                                        {location.city}
                                                    </p>
                                                )}
                                                <p className="text-3xl font-semibold text-gray-900 uppercase">
                                                    {
                                                        getWeatherMeta(
                                                            currentHour.weatherCode,
                                                        ).label
                                                    }
                                                </p>
                                                <p className="text-xl text-gray-400 uppercase pt-1">
                                                    {format(
                                                        new Date(
                                                            metadata.forecastDate ??
                                                                new Date(),
                                                        ),
                                                        "EEE, MMM d",
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {(() => {
                                        const { fluentIcon: WeatherIcon } =
                                            getWeatherMeta(
                                                currentHour.weatherCode,
                                            );
                                        return (
                                            <WeatherIcon
                                                width={110}
                                                height={110}
                                            />
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Hourly rows */}
                            <div className="space-y-1">
                                {hourly.map((hour, i) => {
                                    const localHour = getLocalHour(hour.time);
                                    const isCurrent =
                                        localHour === currentLocalHour;
                                    const isPast = localHour < currentLocalHour;
                                    const { lucideIcon: WeatherIcon, label } =
                                        getWeatherMeta(hour.weatherCode);

                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-center justify-between px-4 py-3 pl-3 rounded-xl bg-white transition-opacity ${
                                                isPast
                                                    ? "opacity-30"
                                                    : "opacity-100"
                                            }`}
                                        >
                                            {/* Red dot */}
                                            <div className="w-2 mr-2 flex items-center justify-center">
                                                {isCurrent && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                )}
                                            </div>

                                            <p
                                                className={`font-semibold w-16 ${isCurrent ? "text-md text-gray-800" : "text-sm text-gray-800"}`}
                                            >
                                                {isCurrent
                                                    ? "Now"
                                                    : formatHour(hour.time)}
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
