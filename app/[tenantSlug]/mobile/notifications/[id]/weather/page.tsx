"use client";

import { useParams } from "next/navigation";
import useNotifications from "@/lib/hooks/notifications/useNotifications";
import { getWeatherMeta } from "@/lib/utils/weatherCode";
import { formatTimeAgo } from "@/lib/utils/formatTimeAgo";
import { Cloud, Droplets } from "lucide-react";

interface HourlyWeather {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
}

function formatHour(utcTime: string): string {
    const date = new Date(utcTime);
    const tzOffset = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");
    const localHour = (date.getUTCHours() + tzOffset) % 24;
    const period = localHour >= 12 ? "PM" : "AM";
    const hour12 = localHour % 12 === 0 ? 12 : localHour % 12;
    return `${hour12} ${period}`;
}

export default function WeatherNotificationPage() {
    const { id } = useParams<{ id: string }>();
    const { data, isLoading } = useNotifications();

    const notification = data?.notifications.find((n) => n.id === id);
    const metadata = notification?.metadata as Record<string, unknown> | null;
    const hourly = (metadata?.hourly as HourlyWeather[]) ?? [];

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
            {/* Summary card */}
            <div className="p-4 rounded-2xl border border-gray-100 bg-white space-y-1">
                <p className="text-base font-bold text-gray-900">
                    {notification.title}
                </p>
                <p className="text-sm text-gray-500">{notification.body}</p>
                <p className="text-xs text-gray-400 pt-1">
                    {formatTimeAgo(notification.createdAt)}
                </p>
            </div>

            {/* Hourly forecast */}
            {hourly.length > 0 ? (
                <div className="p-4 rounded-2xl border border-gray-100 bg-white">
                    <div className="space-y-3">
                        {hourly.map((hour, i) => {
                            const { icon: WeatherIcon, label } = getWeatherMeta(
                                hour.weatherCode,
                            );
                            return (
                                <div
                                    key={i}
                                    className="flex items-center justify-between"
                                >
                                    <p className="text-sm font-bold text-gray-800 w-20">
                                        {formatHour(hour.time)}
                                    </p>
                                    <div className="flex items-center gap-1.5 flex-1">
                                        <WeatherIcon
                                            size={24}
                                            className="text-gray-600 mb-1"
                                        />
                                        <p className="text-sm text-gray-600">
                                            {label}
                                        </p>
                                    </div>
                                    <p className="text-base font-semibold text-gray-900 w-12 text-right">
                                        {hour.temperature}°C
                                    </p>
                                    <div className="flex items-center gap-1 w-14 justify-end text-base">
                                        <Droplets className="w-3 h-3 text-blue-500" />
                                        <p className="text-blue-500">
                                            {hour.precipitationProbability}%
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
