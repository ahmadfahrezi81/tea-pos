import { NextRequest, NextResponse } from "next/server";
import {
    getTodayLocalDateStr,
    getCurrentLocalHour,
    upsertWeatherHour,
} from "@/lib/server/services/weather";

const LOCATION = {
    lat: -6.60534088404916,
    lng: 106.76243694791512,
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

        const realtimeRes = await fetch(
            `https://api.tomorrow.io/v4/weather/realtime?location=${LOCATION.lat},${LOCATION.lng}&apikey=${apiKey}`,
        );

        if (!realtimeRes.ok) {
            return NextResponse.json(
                { error: "Failed to fetch realtime weather from Tomorrow.io" },
                { status: 500 },
            );
        }

        const realtimeData = await realtimeRes.json();
        const values = realtimeData?.data?.values;

        if (!values) {
            return NextResponse.json(
                { error: "No realtime weather data available" },
                { status: 500 },
            );
        }

        const todayDateStr = getTodayLocalDateStr();
        const currentLocalHour = getCurrentLocalHour();

        const result = await upsertWeatherHour({
            date: todayDateStr,
            hour: currentLocalHour,
            temperature: Math.round(values.temperature ?? 0),
            precipitationProbability: Math.round(
                values.precipitationProbability ?? 0,
            ),
            weatherCode: values.weatherCode ?? 1000,
            lat: LOCATION.lat,
            lng: LOCATION.lng,
            city: LOCATION.city,
            region: LOCATION.region,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error ?? "Failed to upsert realtime weather" },
                { status: 500 },
            );
        }

        return NextResponse.json({
            success: true,
            date: todayDateStr,
            hour: currentLocalHour,
            temperature: Math.round(values.temperature ?? 0),
            precipitationProbability: Math.round(
                values.precipitationProbability ?? 0,
            ),
            weatherCode: values.weatherCode ?? 1000,
        });
    } catch (error) {
        console.error("[cron/weather/realtime]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
