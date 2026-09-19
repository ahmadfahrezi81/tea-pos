import useSWR from "swr";
import { weatherApi } from "@/lib/api/weather";
import type { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";
import { SWR } from "@tea-pos/utils/swr";

/**
 * Focus revalidation is off — the root `SWRConfig` owns that for every hook
 * now, and this is the file that explains why it must not come back.
 * `WeatherDrawer` sits on `home/pos` — the boot landing, open all shift — so
 * focus revalidation fired on every wake of every phone, to refetch an hourly
 * forecast out of a cached table. The 20 minute interval is
 * the right mechanism and it already covers this; the focus hook was duplicate
 * work nobody could perceive. See task 063.
 *
 * `revalidateOnReconnect` stays: returning from no signal is a real reason to
 * refetch, and it is rare.
 */
const swrOptions = {
    dedupingInterval: SWR.COOL,
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
