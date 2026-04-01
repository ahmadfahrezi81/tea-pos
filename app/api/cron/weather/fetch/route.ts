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

// ============================================================================
// GET /api/cron/weather/fetch
// Runs every hour at :30 (e.g. 5:30, 6:30 ... 21:30 local time)
// Fetches full day forecast from Tomorrow.io and upserts future hours only.
// Past hours are skipped to preserve immutability for ML/analytics.
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        // ─── Auth ─────────────────────────────────────────────────────
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

        // ─── Fetch from Tomorrow.io ────────────────────────────────────
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

        // ─── Filter to today's hours >= currentHour ────────────────────
        const todayDateStr = getTodayLocalDateStr();
        const currentLocalHour = getCurrentLocalHour();

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
                    localDateStr,
                    localHour,
                }: {
                    localDateStr: string;
                    localHour: number;
                }) =>
                    localDateStr === todayDateStr &&
                    localHour >= currentLocalHour,
            );

        const skipped = hourlyData.length - toUpsert.length;

        // ─── Upsert future hours ───────────────────────────────────────
        const results = await Promise.allSettled(
            toUpsert.map(
                ({
                    localHour,
                    temperature,
                    precipitationProbability,
                    weatherCode,
                }: {
                    localHour: number;
                    temperature: number;
                    precipitationProbability: number;
                    weatherCode: number;
                }) =>
                    upsertWeatherHour({
                        date: todayDateStr,
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

        const failed = results.filter((r) => r.status === "rejected").length;
        const succeeded = results.filter(
            (r) => r.status === "fulfilled",
        ).length;

        return NextResponse.json({
            success: true,
            date: todayDateStr,
            hoursUpserted: succeeded,
            hoursSkipped: skipped,
            hoursFailed: failed,
        });
    } catch (error) {
        console.error("[cron/weather/fetch]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
