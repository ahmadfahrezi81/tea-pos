import { apiFetch } from "./client";
import { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";

export const weatherApi = {
    get: async (params?: { hours?: string; date?: string }) => {
        const sp = new URLSearchParams(
            Object.fromEntries(
                Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
            )
        );
        return WeatherHourlyResponse.parse(await apiFetch<unknown>(`/api/weather?${sp}`));
    },
};
