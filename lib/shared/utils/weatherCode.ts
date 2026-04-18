// lib/utils/weatherCode.ts
// Tomorrow.io weather code mappings
// Full reference: https://docs.tomorrow.io/reference/weather-data-layers#weather-codes

import { Icon, IconProps } from "@iconify/react";
import { ComponentType, createElement } from "react";
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
    Moon,
    CloudMoon,
    CloudMoonRain,
    LucideIcon,
} from "lucide-react";

type FluentIcon = ComponentType<Omit<IconProps, "icon">>;

interface WeatherMeta {
    fluentIcon: FluentIcon;
    lucideIcon: LucideIcon;
    label: string;
}

function makeIcon(name: string): FluentIcon {
    function Component(props: Omit<IconProps, "icon">) {
        return createElement(Icon, { ...props, icon: name });
    }
    Component.displayName = `FluentIcon(${name})`;
    return Component;
}

export function isNightHour(hour: number): boolean {
    return hour < 6 || hour >= 18;
}

export function getWeatherMeta(code: number, isNight = false): WeatherMeta {
    if (code === 1000)
        return {
            fluentIcon: makeIcon(
                isNight ? "fluent-emoji:crescent-moon" : "fluent-emoji:sun",
            ),
            lucideIcon: isNight ? Moon : Sun,
            label: "Clear",
        };
    if (code === 1100)
        return {
            fluentIcon: makeIcon(
                isNight
                    ? "fluent-emoji:crescent-moon"
                    : "fluent-emoji:sun-behind-small-cloud",
            ),
            lucideIcon: isNight ? CloudMoon : CloudSun,
            label: "Mostly Clear",
        };
    if (code === 1101)
        return {
            fluentIcon: makeIcon(
                isNight
                    ? "fluent-emoji:cloud"
                    : "fluent-emoji:sun-behind-cloud",
            ),
            lucideIcon: isNight ? CloudMoon : CloudSun,
            label: "Partly Cloudy",
        };
    if (code === 1102)
        return {
            fluentIcon: makeIcon(
                isNight
                    ? "fluent-emoji:cloud"
                    : "fluent-emoji:sun-behind-large-cloud",
            ),
            lucideIcon: isNight ? CloudMoon : Cloud,
            label: "Mostly Cloudy",
        };
    // everything below has no sun in the icon already — no change needed
    if (code === 1001)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud"),
            lucideIcon: Cloud,
            label: "Cloudy",
        };
    if (code === 2000 || code === 2100)
        return {
            fluentIcon: makeIcon("fluent-emoji:fog"),
            lucideIcon: CloudFog,
            label: "Foggy",
        };
    if (code === 3000 || code === 3001 || code === 3002)
        return {
            fluentIcon: makeIcon("fluent-emoji:wind-face"),
            lucideIcon: Wind,
            label: "Windy",
        };
    if (code === 4000)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-rain"),
            lucideIcon: isNight ? CloudMoonRain : CloudDrizzle,
            label: "Drizzle",
        };
    if (code === 4001)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-rain"),
            lucideIcon: isNight ? CloudMoonRain : CloudRain,
            label: "Light Rain",
        };
    if (code === 4200)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-rain"),
            lucideIcon: isNight ? CloudMoonRain : CloudRain,
            label: "Rain",
        };
    if (code === 4201)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-rain"),
            lucideIcon: isNight ? CloudMoonRain : CloudRain,
            label: "Heavy Rain",
        };
    if (code >= 5000 && code <= 5101)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-snow"),
            lucideIcon: CloudSnow,
            label: "Snow",
        };
    if (code >= 6000 && code <= 6201)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-snow"),
            lucideIcon: isNight ? CloudMoonRain : CloudRain,
            label: "Freezing Rain",
        };
    if (code >= 8000)
        return {
            fluentIcon: makeIcon("fluent-emoji:cloud-with-lightning-and-rain"),
            lucideIcon: CloudLightning,
            label: "Thunderstorm",
        };

    return {
        fluentIcon: makeIcon("fluent-emoji:cloud"),
        lucideIcon: Cloud,
        label: "Unknown",
    };
}
