import { apiFetch, buildParams } from "./client";
import { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";

export const weatherApi = {
    get: async (params?: { hours?: string; date?: string }) => {
        const sp = buildParams((params ?? {}) as Record<string, unknown>);
        return WeatherHourlyResponse.parse(await apiFetch<unknown>(`/api/weather?${sp}`));
    },
};
