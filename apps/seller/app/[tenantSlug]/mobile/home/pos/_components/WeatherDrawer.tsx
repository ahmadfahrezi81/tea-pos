"use client";

import { WeatherDrawer as SharedWeatherDrawer } from "@tea-pos/ui/custom/WeatherDrawer";
import useWeather from "@/lib/hooks/weather/useWeather";
import { useT } from "@/lib/hooks/useT";

/** Feeds the shared drawer this app's forecast and locale. */
export function WeatherDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { data, isLoading } = useWeather();
    const t = useT();

    return (
        <SharedWeatherDrawer
            isOpen={isOpen}
            onClose={onClose}
            data={data}
            isLoading={isLoading}
            t={t}
        />
    );
}
