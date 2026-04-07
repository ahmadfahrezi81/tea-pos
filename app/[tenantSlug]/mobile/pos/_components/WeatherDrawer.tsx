"use client";

import { useMemo } from "react";
import { Drawer } from "vaul";
import { Cloud, X } from "lucide-react";
import { getWeatherMeta, isNightHour } from "@/lib/utils/weatherCode";
import useWeather from "@/lib/hooks/weather/useWeather";
import { getCurrentLocalHour } from "@/lib/utils/time";
import { Bebas_Neue } from "next/font/google";

const bebas = Bebas_Neue({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-bebas",
});

const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalDateStrings(): {
    todayDateStr: string;
    tomorrowDateStr: string;
    yesterdayDateStr: string;
} {
    const nowLocal = new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000);
    const todayDateStr = nowLocal.toISOString().split("T")[0];
    const tomorrowDateStr = new Date(nowLocal.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const yesterdayDateStr = new Date(nowLocal.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    return { todayDateStr, tomorrowDateStr, yesterdayDateStr };
}

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeatherDrawer({ isOpen, onClose }: WeatherDrawerProps) {
    const { data, isLoading } = useWeather();

    const currentLocalHour = getCurrentLocalHour();
    const { todayDateStr, tomorrowDateStr, yesterdayDateStr } =
        getLocalDateStrings();

    const visibleHours = useMemo(() => {
        if (!data?.hourly) return [];

        const fromHour = Math.max(currentLocalHour - 1, 0);
        const spillsTomorrow = currentLocalHour + 6 > 23;
        const cutoffHour = (currentLocalHour + 6) % 24;

        return data.hourly.filter((h) => {
            // at midnight, show yesterday's 11 PM as the past row
            if (h.date === yesterdayDateStr) {
                return currentLocalHour === 0 && h.hour === 23;
            }
            if (spillsTomorrow) {
                if (h.date === todayDateStr) return h.hour >= fromHour;
                if (h.date === tomorrowDateStr) return h.hour < cutoffHour;
                return false;
            }
            return (
                h.date === todayDateStr &&
                h.hour >= fromHour &&
                h.hour <= currentLocalHour + 6
            );
        });
    }, [
        data?.hourly,
        currentLocalHour,
        todayDateStr,
        tomorrowDateStr,
        yesterdayDateStr,
    ]);

    const currentHourData = data?.hourly?.find(
        (h) => h.date === todayDateStr && h.hour === currentLocalHour,
    );

    return (
        <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl px-4 pt-5 pb-10 focus:outline-none max-h-[90dvh] overflow-y-auto">
                    <div className="absolute top-2 left-0 right-0 flex justify-center">
                        <div className="w-8 h-1 rounded-full bg-gray-300" />
                    </div>

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

                    {isLoading && (
                        <div className="space-y-3">
                            <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
                            <div className="h-64 rounded-2xl bg-gray-200 animate-pulse" />
                        </div>
                    )}

                    {!isLoading && !data && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Cloud className="w-10 h-10 mb-3" />
                            <p className="text-sm">No weather data available</p>
                        </div>
                    )}

                    {!isLoading && data && (
                        <div className="space-y-1">
                            {visibleHours.map((hour) => {
                                const isCurrent =
                                    hour.date === todayDateStr &&
                                    hour.hour === currentLocalHour;
                                const isPast =
                                    hour.date === yesterdayDateStr ||
                                    (hour.date === todayDateStr &&
                                        hour.hour < currentLocalHour);
                                const isNight = isNightHour(hour.hour);
                                const { lucideIcon: WeatherIcon, label } =
                                    getWeatherMeta(hour.weatherCode, isNight);

                                return (
                                    <div
                                        key={`${hour.date}-${hour.hour}`}
                                        className={`flex items-center justify-between px-4 py-3 pl-3 rounded-xl transition-opacity ${
                                            isPast
                                                ? "opacity-30 bg-gray-50"
                                                : isCurrent
                                                  ? "bg-blue-50"
                                                  : "bg-gray-50"
                                        }`}
                                    >
                                        <p
                                            className={`font-semibold w-16 ${
                                                isCurrent
                                                    ? "text-base text-blue-500"
                                                    : "text-sm text-gray-800"
                                            }`}
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

                                        {hour.precipitationProbability > 0 && (
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
                    )}
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
