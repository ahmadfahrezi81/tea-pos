import useSWR from "swr";
import { weatherApi } from "@/lib/api/weather";
import type { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";

/**
 * No `revalidateOnFocus`. `WeatherDrawer` sits on `home/pos` — the boot landing,
 * open all shift — so focus revalidation fired on every wake of every phone, to
 * refetch an hourly forecast out of a cached table. The 20 minute interval is
 * the right mechanism and it already covers this; the focus hook was duplicate
 * work nobody could perceive. See task 063.
 *
 * `revalidateOnReconnect` stays: returning from no signal is a real reason to
 * refetch, and it is rare.
 */
const swrOptions = {
    revalidateOnFocus: false,
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
