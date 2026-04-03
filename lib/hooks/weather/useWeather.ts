import useSWR from "swr";
import { WeatherHourlyResponse } from "@/lib/schemas/weather";

const fetchWeather = async (url: string): Promise<WeatherHourlyResponse> => {
    const res = await fetch(url);

    if (!res.ok) {
        let errMsg = `Failed to fetch weather: ${res.status}`;
        try {
            const body = await res.json();
            if (body?.error) errMsg += ` - ${body.error}`;
        } catch {
            // ignore
        }
        throw new Error(errMsg);
    }

    const json = await res.json();

    const parsed = WeatherHourlyResponse.safeParse(json);
    if (!parsed.success) {
        console.error("Invalid weather response:", parsed.error.format());
        throw new Error("Invalid weather response shape");
    }

    return parsed.data;
};

export default function useWeather(date?: string) {
    const key = `/api/weather${date ? `?date=${date}` : ""}`;

    return useSWR<WeatherHourlyResponse>(key, fetchWeather, {
        revalidateOnFocus: true,
        dedupingInterval: 60_000,
    });
}
