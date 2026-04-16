import { NextRequest, NextResponse } from "next/server";
import {
    getTodayLocalDateStr,
    getCurrentLocalHour,
    upsertWeatherHour,
} from "@/lib/services/weather";

const TZ_OFFSET = parseInt(process.env.TIMEZONE_OFFSET ?? "7");

const LOCATION = {
    lat: -6.590049642741057,
    lng: 106.75922097982183,
    city: "Ciomas",
    region: "Bogor",
} as const;

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const apiKey = process.env.TOMORROW_IO_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing TOMORROW_IO_API_KEY" },
                { status: 500 },
            );
        }

        const weatherRes = await fetch(
            `https://api.tomorrow.io/v4/weather/forecast?location=${LOCATION.lat},${LOCATION.lng}&timesteps=1h&apikey=${apiKey}`,
        );

        if (!weatherRes.ok) {
            return NextResponse.json(
                { error: "Failed to fetch weather data from Tomorrow.io" },
                { status: 500 },
            );
        }

        const weatherData = await weatherRes.json();
        const hourlyData = weatherData?.timelines?.hourly;

        if (!hourlyData || hourlyData.length === 0) {
            return NextResponse.json(
                { error: "No hourly forecast data available" },
                { status: 500 },
            );
        }

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
                        // skip current hour — owned by realtime cron
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
                    upsertWeatherHour({
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
            console.error(
                "[cron] upsert failed:",
                (r as PromiseRejectedResult).reason,
            ),
        );
        const succeeded = results.length - failed.length;

        return NextResponse.json({
            success: true,
            date: todayDateStr,
            hoursUpserted: succeeded,
            skippedPast,
            skippedFuture,
            hoursFailed: failed.length,
        });
    } catch (error) {
        console.error("[cron/weather/fetch]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
