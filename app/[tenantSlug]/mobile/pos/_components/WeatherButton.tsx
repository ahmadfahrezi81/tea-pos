"use client";

import { useMemo } from "react";
import useWeather from "@/lib/hooks/weather/useWeather";
import { getWeatherMeta, isNightHour } from "@/lib/utils/weatherCode";
import { getCurrentLocalHour } from "@/lib/utils/time";

interface WeatherButtonProps {
    onClick: () => void;
}

export function WeatherButton({ onClick }: WeatherButtonProps) {
    const { data, isLoading } = useWeather();

    const currentLocalHour = getCurrentLocalHour();

    const WeatherIcon = useMemo(() => {
        if (!data?.hourly) return null;
        const current =
            data.hourly.find((h) => h.hour === currentLocalHour) ??
            data.hourly[0];
        return getWeatherMeta(
            current.weatherCode,
            isNightHour(currentLocalHour),
        ).fluentIcon;
    }, [data?.hourly, currentLocalHour]);

    return (
        <button
            onClick={onClick}
            className=" pr-0 active:scale-95 flex items-center justify-center w-17.5 h-17.5"
        >
            {isLoading || !WeatherIcon ? (
                <div className="flex items-center justify-center animate-pulse">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <WeatherIcon width={70} height={70} />
            )}
        </button>
    );
}
