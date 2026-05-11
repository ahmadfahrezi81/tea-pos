import { NextRequest } from "next/server";
import {
    getTodayLocalDateStr,
    getCurrentLocalHour,
    upsertWeatherHour,
} from "@tea-pos/services/weather";
import { getServiceClient } from "@/lib/supabase/service";
import { ok, err, unauthorized } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

const TZ_OFFSET = parseInt(process.env.TIMEZONE_OFFSET ?? "7");

const LOCATION = {
    lat: -6.60534088404916,
    lng: 106.76243694791512,
    city: "Ciomas",
    region: "Bogor",
} as const;

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized();

        const supabase = getServiceClient();
        const apiKey = process.env.TOMORROW_IO_API_KEY;
        if (!apiKey) return err("Missing TOMORROW_IO_API_KEY");

        const weatherRes = await fetch(
            `https://api.tomorrow.io/v4/weather/forecast?location=${LOCATION.lat},${LOCATION.lng}&timesteps=1h&apikey=${apiKey}`,
        );

        if (!weatherRes.ok) return err("Failed to fetch weather data from Tomorrow.io");

        const weatherData = await weatherRes.json();
        const hourlyData = weatherData?.timelines?.hourly;

        if (!hourlyData || hourlyData.length === 0) return err("No hourly forecast data available");

        const todayDateStr = getTodayLocalDateStr();
        const currentLocalHour = getCurrentLocalHour();
        const cutoffTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const toUpsert = hourlyData
            .map((hour: { time: string; values: Record<string, number> }) => {
                const utcDate = new Date(hour.time);
                const localHour = (utcDate.getUTCHours() + TZ_OFFSET) % 24;
                const localDateStr = new Date(
                    utcDate.getTime() + TZ_OFFSET * 60 * 60 * 1000,
                )
                    .toISOString()
                    .split("T")[0];

                return {
                    utcDate,
                    localDateStr,
                    localHour,
                    temperature: Math.round(hour.values?.temperature ?? 0),
                    precipitationProbability: Math.round(
                        hour.values?.precipitationProbability ?? 0,
                    ),
                    weatherCode: hour.values?.weatherCode ?? 1000,
                };
            })
            .filter(
                ({
                    utcDate,
                    localDateStr,
                    localHour,
                }: {
                    utcDate: Date;
                    localDateStr: string;
                    localHour: number;
                }) => {
                    if (utcDate > cutoffTime) return false;
                    if (localDateStr === todayDateStr) {
                        return localHour > currentLocalHour;
                    }
                    return true;
                },
            );

        const skippedPast = hourlyData.filter((hour: { time: string }) => {
            const utcDate = new Date(hour.time);
            const localHour = (utcDate.getUTCHours() + TZ_OFFSET) % 24;
            const localDateStr = new Date(
                utcDate.getTime() + TZ_OFFSET * 60 * 60 * 1000,
            )
                .toISOString()
                .split("T")[0];
            return (
                localDateStr === todayDateStr && localHour <= currentLocalHour
            );
        }).length;

        const skippedFuture = hourlyData.length - toUpsert.length - skippedPast;

        const results = await Promise.allSettled(
            toUpsert.map(
                ({
                    localHour,
                    localDateStr,
                    temperature,
                    precipitationProbability,
                    weatherCode,
                }: {
                    localHour: number;
                    localDateStr: string;
                    temperature: number;
                    precipitationProbability: number;
                    weatherCode: number;
                }) =>
                    upsertWeatherHour(supabase, {
                        date: localDateStr,
                        hour: localHour,
                        temperature,
                        precipitationProbability,
                        weatherCode,
                        lat: LOCATION.lat,
                        lng: LOCATION.lng,
                        city: LOCATION.city,
                        region: LOCATION.region,
                    }),
            ),
        );

        const failed = results.filter((r) => r.status === "rejected");
        failed.forEach((r) =>
            logger.error("GET /api/cron/weather/fetch upsert failed", (r as PromiseRejectedResult).reason),
        );
        const succeeded = results.length - failed.length;

        return ok({
            success: true,
            date: todayDateStr,
            hoursUpserted: succeeded,
            skippedPast,
            skippedFuture,
            hoursFailed: failed.length,
        });
    } catch (error) {
        logger.error("GET /api/cron/weather/fetch", error);
        return err("Internal server error");
    }
}
