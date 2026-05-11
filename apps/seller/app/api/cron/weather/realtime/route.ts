import { NextRequest } from "next/server";
import {
    getTodayLocalDateStr,
    getCurrentLocalHour,
    upsertWeatherHour,
} from "@tea-pos/services/weather";
import { getServiceClient } from "@/lib/supabase/service";
import { ok, err, unauthorized } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

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

        const realtimeRes = await fetch(
            `https://api.tomorrow.io/v4/weather/realtime?location=${LOCATION.lat},${LOCATION.lng}&apikey=${apiKey}`,
        );

        if (!realtimeRes.ok) return err("Failed to fetch realtime weather from Tomorrow.io");

        const realtimeData = await realtimeRes.json();
        const values = realtimeData?.data?.values;

        if (!values) return err("No realtime weather data available");

        const todayDateStr = getTodayLocalDateStr();
        const currentLocalHour = getCurrentLocalHour();

        const result = await upsertWeatherHour(supabase, {
            date: todayDateStr,
            hour: currentLocalHour,
            temperature: Math.round(values.temperature ?? 0),
            precipitationProbability: Math.round(values.precipitationProbability ?? 0),
            weatherCode: values.weatherCode ?? 1000,
            lat: LOCATION.lat,
            lng: LOCATION.lng,
            city: LOCATION.city,
            region: LOCATION.region,
        });

        if (!result.success) return err(result.error ?? "Failed to upsert realtime weather");

        return ok({
            success: true,
            date: todayDateStr,
            hour: currentLocalHour,
            temperature: Math.round(values.temperature ?? 0),
            precipitationProbability: Math.round(values.precipitationProbability ?? 0),
            weatherCode: values.weatherCode ?? 1000,
        });
    } catch (error) {
        logger.error("GET /api/cron/weather/realtime", error);
        return err("Internal server error");
    }
}
