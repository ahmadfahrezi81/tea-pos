// import { createRouteHandlerClient } from "@/lib/supabase/server";

// const TZ_OFFSET = parseInt(process.env.TIMEZONE_OFFSET ?? "7");

// export function getTodayLocalDateStr(): string {
//     const now = new Date();
//     return new Date(now.getTime() + TZ_OFFSET * 60 * 60 * 1000)
//         .toISOString()
//         .split("T")[0];
// }

// export function getCurrentLocalHour(): number {
//     return (new Date().getUTCHours() + TZ_OFFSET) % 24;
// }

// export interface WeatherHourlyRow {
//     id: string;
//     date: string;
//     hour: number;
//     temperature: number;
//     precipitationProbability: number;
//     weatherCode: number;
//     lat: number;
//     lng: number;
//     city: string;
//     region: string;
//     fetchedAt: string;
//     createdAt: string;
// }

// export interface UpsertWeatherParams {
//     date: string;
//     hour: number;
//     temperature: number;
//     precipitationProbability: number;
//     weatherCode: number;
//     lat: number;
//     lng: number;
//     city: string;
//     region: string;
// }

// /**
//  * Upsert a single hourly weather row.
//  * Only call this for hours >= currentHour to preserve immutability of past data.
//  */
// export async function upsertWeatherHour(
//     params: UpsertWeatherParams,
// ): Promise<{ success: boolean; error?: string }> {
//     try {
//         const supabase = await createRouteHandlerClient();

//         const { error } = await supabase.from("weather_hourly").upsert(
//             {
//                 date: params.date,
//                 hour: params.hour,
//                 temperature: params.temperature,
//                 precipitation_probability: params.precipitationProbability,
//                 weather_code: params.weatherCode,
//                 lat: params.lat,
//                 lng: params.lng,
//                 city: params.city,
//                 region: params.region,
//                 fetched_at: new Date().toISOString(),
//             },
//             { onConflict: "date,hour" },
//         );

//         if (error) {
//             console.error("[upsertWeatherHour] Supabase error:", error);
//             return { success: false, error: error.message };
//         }

//         return { success: true };
//     } catch (err) {
//         console.error("[upsertWeatherHour] Unexpected error:", err);
//         return { success: false, error: "Unexpected error upserting weather" };
//     }
// }

// /**
//  * Fetch all hourly weather rows for a given date, ordered by hour.
//  */
// export async function getWeatherForDate(date: string): Promise<{
//     data: WeatherHourlyRow[] | null;
//     error?: string;
// }> {
//     try {
//         const supabase = await createRouteHandlerClient();

//         const { data, error } = await supabase
//             .from("weather_hourly")
//             .select("*")
//             .eq("date", date)
//             .order("hour", { ascending: true });

//         if (error) {
//             console.error("[getWeatherForDate] Supabase error:", error);
//             return { data: null, error: error.message };
//         }

//         const mapped: WeatherHourlyRow[] = (data ?? []).map((row) => ({
//             id: row.id,
//             date: row.date,
//             hour: row.hour,
//             temperature: row.temperature,
//             precipitationProbability: row.precipitation_probability,
//             weatherCode: row.weather_code,
//             lat: row.lat,
//             lng: row.lng,
//             city: row.city,
//             region: row.region,
//             fetchedAt: row.fetched_at,
//             createdAt: row.created_at,
//         }));

//         return { data: mapped };
//     } catch (err) {
//         console.error("[getWeatherForDate] Unexpected error:", err);
//         return { data: null, error: "Unexpected error fetching weather" };
//     }
// }

// /**
//  * Build the rain notification body line based on max precipitation probability.
//  */
// export function buildRainLine(
//     maxRain: number,
//     prettyDate: string,
// ): {
//     title: string;
//     body: string;
// } {
//     const body =
//         maxRain === 0
//             ? `0% chance of rain — all clear. Tap to check the forecast.`
//             : maxRain <= 20
//               ? `Up to ${maxRain}% chance of rain — conditions looking good. Tap to check the forecast.`
//               : maxRain <= 50
//                 ? `Up to ${maxRain}% chance of rain — expect some showers. Tap to check the forecast.`
//                 : `Up to ${maxRain}% chance of rain — heavy rain likely. Tap to check the forecast.`;

//     return {
//         title: `Weather Update · ${prettyDate}`,
//         body,
//     };
// }

// /**
//  * Fetch hourly weather rows for the next N hours, spanning today and tomorrow.
//  * Returns rows ordered by date + hour ascending.
//  */
// export async function getWeatherNextHours(hours: number = 24): Promise<{
//     data: WeatherHourlyRow[] | null;
//     error?: string;
// }> {
//     try {
//         const supabase = await createRouteHandlerClient();

//         const now = new Date();
//         const localNow = new Date(now.getTime() + TZ_OFFSET * 60 * 60 * 1000);
//         const currentLocalHour = localNow.getUTCHours();
//         const todayDateStr = localNow.toISOString().split("T")[0];
//         const tomorrowDateStr = new Date(
//             localNow.getTime() + 24 * 60 * 60 * 1000,
//         )
//             .toISOString()
//             .split("T")[0];

//         const { data, error } = await supabase
//             .from("weather_hourly")
//             .select("*")
//             .in("date", [todayDateStr, tomorrowDateStr])
//             .order("date", { ascending: true })
//             .order("hour", { ascending: true });

//         if (error) {
//             console.error("[getWeatherNextHours] Supabase error:", error);
//             return { data: null, error: error.message };
//         }

//         const cutoffHour = (currentLocalHour + hours) % 24;
//         const spillsIntoTomorrow = currentLocalHour + hours > 24;

//         const filtered = (data ?? []).filter((row) => {
//             if (row.date === todayDateStr) {
//                 return row.hour >= currentLocalHour - 1; // include 1 past hour
//             }
//             if (row.date === tomorrowDateStr && spillsIntoTomorrow) {
//                 return row.hour < cutoffHour;
//             }
//             return false;
//         });
//         const mapped: WeatherHourlyRow[] = filtered.map((row) => ({
//             id: row.id,
//             date: row.date,
//             hour: row.hour,
//             temperature: row.temperature,
//             precipitationProbability: row.precipitation_probability,
//             weatherCode: row.weather_code,
//             lat: row.lat,
//             lng: row.lng,
//             city: row.city,
//             region: row.region,
//             fetchedAt: row.fetched_at,
//             createdAt: row.created_at,
//         }));

//         return { data: mapped };
//     } catch (err) {
//         console.error("[getWeatherNextHours] Unexpected error:", err);
//         return { data: null, error: "Unexpected error fetching weather" };
//     }
// }

import { createRouteHandlerClient } from "@/lib/supabase/server";

const TZ_OFFSET = parseInt(process.env.TIMEZONE_OFFSET ?? "7");

// ─── Local time utils ─────────────────────────────────────────────────────────

function getLocalNow(): Date {
    return new Date(Date.now() + TZ_OFFSET * 60 * 60 * 1000);
}

export function getTodayLocalDateStr(): string {
    return getLocalNow().toISOString().split("T")[0];
}

export function getCurrentLocalHour(): number {
    return getLocalNow().getUTCHours();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherHourlyRow {
    id: string;
    date: string;
    hour: number;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
    lat: number;
    lng: number;
    city: string;
    region: string;
    fetchedAt: string;
    createdAt: string;
}

export interface UpsertWeatherParams {
    date: string;
    hour: number;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
    lat: number;
    lng: number;
    city: string;
    region: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): WeatherHourlyRow {
    return {
        id: row.id as string,
        date: row.date as string,
        hour: row.hour as number,
        temperature: row.temperature as number,
        precipitationProbability: row.precipitation_probability as number,
        weatherCode: row.weather_code as number,
        lat: row.lat as number,
        lng: row.lng as number,
        city: row.city as string,
        region: row.region as string,
        fetchedAt: row.fetched_at as string,
        createdAt: row.created_at as string,
    };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function upsertWeatherHour(
    params: UpsertWeatherParams,
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createRouteHandlerClient();
        const { error } = await supabase.from("weather_hourly").upsert(
            {
                date: params.date,
                hour: params.hour,
                temperature: params.temperature,
                precipitation_probability: params.precipitationProbability,
                weather_code: params.weatherCode,
                lat: params.lat,
                lng: params.lng,
                city: params.city,
                region: params.region,
                fetched_at: new Date().toISOString(),
            },
            { onConflict: "date,hour" },
        );

        if (error) {
            console.error("[upsertWeatherHour] Supabase error:", error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error("[upsertWeatherHour] Unexpected error:", err);
        return { success: false, error: "Unexpected error upserting weather" };
    }
}

export async function getWeatherForDate(date: string): Promise<{
    data: WeatherHourlyRow[] | null;
    error?: string;
}> {
    try {
        const supabase = await createRouteHandlerClient();
        const { data, error } = await supabase
            .from("weather_hourly")
            .select("*")
            .eq("date", date)
            .order("hour", { ascending: true });

        if (error) {
            console.error("[getWeatherForDate] Supabase error:", error);
            return { data: null, error: error.message };
        }

        return { data: (data ?? []).map(mapRow) };
    } catch (err) {
        console.error("[getWeatherForDate] Unexpected error:", err);
        return { data: null, error: "Unexpected error fetching weather" };
    }
}

export async function getWeatherNextHours(hours: number = 24): Promise<{
    data: WeatherHourlyRow[] | null;
    error?: string;
}> {
    try {
        const supabase = await createRouteHandlerClient();
        const localNow = getLocalNow();
        const currentLocalHour = localNow.getUTCHours();
        const todayDateStr = localNow.toISOString().split("T")[0];
        const tomorrowDateStr = new Date(
            localNow.getTime() + 24 * 60 * 60 * 1000,
        )
            .toISOString()
            .split("T")[0];
        const yesterdayDateStr = new Date(
            localNow.getTime() - 24 * 60 * 60 * 1000,
        )
            .toISOString()
            .split("T")[0];

        const datesToQuery =
            currentLocalHour === 0
                ? [yesterdayDateStr, todayDateStr, tomorrowDateStr]
                : [todayDateStr, tomorrowDateStr];

        const { data, error } = await supabase
            .from("weather_hourly")
            .select("*")
            .in("date", datesToQuery)
            .order("date", { ascending: true })
            .order("hour", { ascending: true });

        if (error) {
            console.error("[getWeatherNextHours] Supabase error:", error);
            return { data: null, error: error.message };
        }

        const endHour = currentLocalHour + hours;
        const spillsIntoTomorrow = endHour >= 24;
        const cutoffHour = endHour % 24;
        const fromHour = Math.max(currentLocalHour - 1, 0);

        const filtered = (data ?? []).filter((row) => {
            if (row.date === yesterdayDateStr) {
                return currentLocalHour === 0 && row.hour === 23;
            }
            if (row.date === todayDateStr) return row.hour >= fromHour;
            if (row.date === tomorrowDateStr && spillsIntoTomorrow) {
                return cutoffHour === 0 || row.hour < cutoffHour;
            }
            return false;
        });

        return { data: filtered.map(mapRow) };
    } catch (err) {
        console.error("[getWeatherNextHours] Unexpected error:", err);
        return { data: null, error: "Unexpected error fetching weather" };
    }
}

export function buildRainLine(
    maxRain: number,
    prettyDate: string,
): { title: string; body: string } {
    const body =
        maxRain === 0
            ? `0% chance of rain — all clear. Tap to check the forecast.`
            : maxRain <= 20
              ? `Up to ${maxRain}% chance of rain — conditions looking good. Tap to check the forecast.`
              : maxRain <= 50
                ? `Up to ${maxRain}% chance of rain — expect some showers. Tap to check the forecast.`
                : `Up to ${maxRain}% chance of rain — heavy rain likely. Tap to check the forecast.`;

    return { title: `Weather Update · ${prettyDate}`, body };
}
