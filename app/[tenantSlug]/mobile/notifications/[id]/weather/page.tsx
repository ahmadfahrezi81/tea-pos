// app/[tenantSlug]/mobile/notifications/[id]/weather/page.tsx
"use client";

import { useParams } from "next/navigation";
import useNotifications from "@/lib/hooks/notifications/useNotifications";
import { getWeatherMeta } from "@/lib/utils/weatherCode";
import { Cloud } from "lucide-react";
import { Bebas_Neue } from "next/font/google";
import { useMemo } from "react";
import { format } from "date-fns";

const bebas = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bebas",
});

interface HourlyWeather {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
}

interface WeatherLocation {
    lat: number;
    lng: number;
    city: string;
    region: string;
}

interface WeatherMetadata {
    slot: string;
    hourly: HourlyWeather[];
    location: WeatherLocation;
    tempMax: number;
    tempMin: number;
    windowTo: number;
    windowFrom: number;
    forecastDate: string;
    maxRainProbability: number;
}

const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

function getLocalHour(utcTime: string): number {
    return (new Date(utcTime).getUTCHours() + TZ_OFFSET) % 24;
}

function formatHour(utcTime: string): string {
    const localHour = getLocalHour(utcTime);
    const period = localHour >= 12 ? "PM" : "AM";
    const hour12 = localHour % 12 === 0 ? 12 : localHour % 12;
    return `${hour12} ${period}`;
}

function getCurrentLocalHour(): number {
    return (new Date().getUTCHours() + TZ_OFFSET) % 24;
}

function getCurrentHourTemp(hourly: HourlyWeather[]): HourlyWeather | null {
    const localNowHour = getCurrentLocalHour();
    return (
        hourly.find((h) => getLocalHour(h.time) === localNowHour) ?? hourly[0]
    );
}

export default function WeatherNotificationPage() {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading } = useNotifications();

    const notification = data?.notifications.find((n) => n.id === id);
    const metadata = notification?.metadata as WeatherMetadata | null;
    const hourly = metadata?.hourly ?? [];
    const location = metadata?.location;

    const currentLocalHour = useMemo(() => getCurrentLocalHour(), []);
    const currentHour = useMemo(() => getCurrentHourTemp(hourly), [hourly]);

    if (isLoading) {
        return (
            <div className="space-y-3">
                <div className="h-6 w-32 rounded bg-gray-100 animate-pulse" />
                <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
                <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
        );
    }

    if (!notification) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Cloud className="w-10 h-10 mb-3" />
                <p className="text-sm">Notification not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {currentHour && (
                <div className="rounded-2xl">
                    <div className="flex items-center justify-between -mb-6 -mt-2">
                        {/* Left */}
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
                                                metadata?.forecastDate ??
                                                    new Date(),
                                            ),
                                            "EEE, MMM d",
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right — big fluent icon */}
                        {(() => {
                            const { fluentIcon: WeatherIcon } = getWeatherMeta(
                                currentHour.weatherCode,
                            );
                            return <WeatherIcon width={120} height={120} />;
                        })()}
                    </div>
                </div>
            )}

            {/* Hourly forecast */}
            {hourly.length > 0 ? (
                <div className="space-y-1">
                    {hourly.map((hour, i) => {
                        const localHour = getLocalHour(hour.time);
                        const isCurrent = localHour === currentLocalHour;
                        const isPast = localHour < currentLocalHour;
                        const { lucideIcon: WeatherIcon, label } =
                            getWeatherMeta(hour.weatherCode);

                        return (
                            <div
                                key={i}
                                className={`flex items-center justify-between px-4 py-3 pl-3 rounded-xl bg-white transition-opacity ${
                                    isPast ? "opacity-30" : "opacity-100"
                                }`}
                            >
                                {/* Current hour red dot indicator */}
                                <div className="w-2 mr-2 flex items-center justify-center">
                                    {isCurrent && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    )}
                                </div>

                                <p
                                    className={`font-semibold w-16 text-gray-800 ${isCurrent ? "text-md" : "text-sm "}`}
                                >
                                    {isCurrent ? "Now" : formatHour(hour.time)}
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
                                {hour.precipitationProbability > 0 && (
                                    <div className="flex items-center gap-1 w-14 justify-end">
                                        <p className="text-xs font-bold text-white bg-cyan-400 rounded-sm px-1 py-0.5">
                                            {hour.precipitationProbability}%
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
            ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Cloud className="w-8 h-8 mb-2" />
                    <p className="text-sm">No hourly data available</p>
                </div>
            )}
        </div>
    );
}
