// app/[tenantSlug]/mobile/notifications/[id]/weather/page.tsx
"use client";

import { useParams } from "next/navigation";
import useNotifications from "@/lib/hooks/notifications/useNotifications";
import { getWeatherMeta } from "@/lib/utils/weatherCode";
import { Cloud } from "lucide-react";
import { Bebas_Neue } from "next/font/google";

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

function formatHour(utcTime: string): string {
    const date = new Date(utcTime);
    const tzOffset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const localHour = (date.getUTCHours() + tzOffset) % 24;
    const period = localHour >= 12 ? "PM" : "AM";
    const hour12 = localHour % 12 === 0 ? 12 : localHour % 12;
    return `${hour12} ${period}`;
}

function getCurrentHourTemp(hourly: HourlyWeather[]): HourlyWeather | null {
    const now = new Date();
    const tzOffset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const localNowHour = (now.getUTCHours() + tzOffset) % 24;

    return (
        hourly.find((h) => {
            const localHour = (new Date(h.time).getUTCHours() + tzOffset) % 24;
            return localHour === localNowHour;
        }) ?? hourly[0]
    );
}

export default function WeatherNotificationPage() {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading } = useNotifications();

    const notification = data?.notifications.find((n) => n.id === id);
    const metadata = notification?.metadata as WeatherMetadata | null;
    const hourly = metadata?.hourly ?? [];
    const location = metadata?.location;
    const currentHour = getCurrentHourTemp(hourly);

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
                            className={`flex items-center gap-1 ${bebas.variable}`}
                        >
                            <p className="font-bebas text-8xl text-gray-900 tracking-tight">
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
                        const { lucideIcon: WeatherIcon, label } =
                            getWeatherMeta(hour.weatherCode);
                        return (
                            <div
                                key={i}
                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white"
                            >
                                <p className="text-sm font-semibold text-gray-800 w-16">
                                    {formatHour(hour.time)}
                                </p>
                                <div className="flex items-center gap-1.5 flex-1">
                                    <WeatherIcon
                                        size={20}
                                        className="text-gray-900"
                                    />
                                    <p className="text-sm text-gray-600">
                                        {label}
                                    </p>
                                </div>
                                {hour.precipitationProbability > 0 && (
                                    <div className="flex items-center gap-1 w-14 justify-end">
                                        <p className="text-sm font-bold text-cyan-400">
                                            {hour.precipitationProbability}%
                                        </p>
                                    </div>
                                )}
                                <p className="text-sm font-semibold text-gray-900 w-12 text-right">
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
