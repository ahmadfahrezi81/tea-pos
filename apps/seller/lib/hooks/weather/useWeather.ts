import useSWR from "swr";
import { weatherApi } from "@/lib/api/weather";
import type { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";

const swrOptions = {
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
    refreshInterval: 20 * 60 * 1000,
    revalidateIfStale: false,
    revalidateOnReconnect: true,
};

export default function useWeather() {
    return useSWR<WeatherHourlyResponse>(
        "weather-24h",
        () => weatherApi.get({ hours: "24" }),
        swrOptions,
    );
}
