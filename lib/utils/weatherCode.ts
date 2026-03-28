// lib/utils/weatherCode.ts
// Tomorrow.io weather code mappings
// Full reference: https://docs.tomorrow.io/reference/weather-data-layers#weather-codes

import {
    Sun,
    Cloud,
    CloudSun,
    CloudRain,
    CloudDrizzle,
    CloudSnow,
    CloudLightning,
    CloudFog,
    Wind,
    LucideIcon,
} from "lucide-react";

interface WeatherMeta {
    icon: LucideIcon;
    label: string;
}

export function getWeatherMeta(code: number): WeatherMeta {
    // Clear
    if (code === 1000) return { icon: Sun, label: "Clear" };

    // Mostly clear
    if (code === 1100) return { icon: CloudSun, label: "Mostly Clear" };

    // Partly cloudy
    if (code === 1101) return { icon: CloudSun, label: "Partly Cloudy" };

    // Mostly cloudy
    if (code === 1102) return { icon: Cloud, label: "Mostly Cloudy" };

    // Cloudy
    if (code === 1001) return { icon: Cloud, label: "Cloudy" };

    // Fog
    if (code === 2000 || code === 2100)
        return { icon: CloudFog, label: "Foggy" };

    // Light wind / Wind
    if (code === 3000 || code === 3001 || code === 3002)
        return { icon: Wind, label: "Windy" };

    // Drizzle
    if (code === 4000) return { icon: CloudDrizzle, label: "Drizzle" };

    // Light rain
    if (code === 4001) return { icon: CloudRain, label: "Light Rain" };

    // Rain
    if (code === 4200) return { icon: CloudRain, label: "Rain" };

    // Heavy rain
    if (code === 4201) return { icon: CloudRain, label: "Heavy Rain" };

    // Snow
    if (code >= 5000 && code <= 5101) return { icon: CloudSnow, label: "Snow" };

    // Freezing rain / ice
    if (code >= 6000 && code <= 6201)
        return { icon: CloudRain, label: "Freezing Rain" };

    // Thunderstorm
    if (code >= 8000) return { icon: CloudLightning, label: "Thunderstorm" };

    // Fallback
    return { icon: Cloud, label: "Unknown" };
}
