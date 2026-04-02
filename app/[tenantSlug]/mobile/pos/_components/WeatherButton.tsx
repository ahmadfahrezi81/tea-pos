"use client";

import { useMemo } from "react";
import useWeather from "@/lib/hooks/weather/useWeather";
import { getWeatherMeta } from "@/lib/utils/weatherCode";

const TZ_OFFSET = parseInt(process.env.NEXT_PUBLIC_TIMEZONE_OFFSET ?? "7");

function getCurrentLocalHour(): number {
    return (new Date().getUTCHours() + TZ_OFFSET) % 24;
}

interface WeatherButtonProps {
    onClick: () => void;
}

export function WeatherButton({ onClick }: WeatherButtonProps) {
    const { data, isLoading } = useWeather();

    const currentLocalHour = useMemo(() => getCurrentLocalHour(), []);

    const WeatherIcon = useMemo(() => {
        if (!data?.hourly) return null;
        const current =
            data.hourly.find((h) => h.hour === currentLocalHour) ??
            data.hourly[0];
        return getWeatherMeta(current.weatherCode).fluentIcon;
    }, [data?.hourly, currentLocalHour]);

    return (
        <button
            onClick={onClick}
            className="p-1 pr-0 active:scale-95 flex items-center justify-center w-16 h-16"
        >
            {isLoading || !WeatherIcon ? (
                <div className="flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <WeatherIcon width={65} height={65} />
            )}
        </button>
    );
}
