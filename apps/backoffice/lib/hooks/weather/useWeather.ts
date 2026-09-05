import useSWR from "swr";
import { weatherApi } from "@/lib/api/weather";
import type { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";

/**
 * No `revalidateOnFocus`. The 20 minute interval is the right mechanism for an
 * hourly forecast out of a cached table, and the focus hook was duplicate work
 * on top of it — it fired on every wake of every phone. See task 063; seller's
 * copy of this file carries the same change.
 *
 * Cheaper here than in seller, where `WeatherDrawer` sits on the boot landing:
 * backoffice reads this from `MoreMenu`, which is a screen you have to navigate
 * to. Changed for symmetry as much as for the cost.
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
