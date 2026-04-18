import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import {
    getTodayLocalDateStr,
    getWeatherForDate,
    getWeatherNextHours,
    WeatherHourlyRow,
} from "@/lib/server/services/weather";
import { WeatherHourlyResponse } from "@/lib/shared/schemas/weather";

// ─── Shared helper ────────────────────────────────────────────────────────────

function buildPayload(hourly: WeatherHourlyRow[], date: string) {
    let tempMax = -Infinity,
        tempMin = Infinity,
        maxPrecip = 0;
    for (const h of hourly) {
        if (h.temperature > tempMax) tempMax = h.temperature;
        if (h.temperature < tempMin) tempMin = h.temperature;
        if (h.precipitationProbability > maxPrecip)
            maxPrecip = h.precipitationProbability;
    }
    return {
        date,
        city: hourly[0].city,
        region: hourly[0].region,
        hourly,
        tempMax,
        tempMin,
        maxPrecipitationProbability: maxPrecip,
    };
}

function validateAndRespond(hourly: WeatherHourlyRow[], date: string) {
    const parsed = WeatherHourlyResponse.safeParse(buildPayload(hourly, date));
    if (!parsed.success) {
        console.error("[GET /api/weather] Validation failed:", parsed.error);
        return NextResponse.json(
            { error: "Invalid response shape", details: parsed.error.format() },
            { status: 500 },
        );
    }
    return NextResponse.json(parsed.data);
}

// ─── GET /api/weather ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const hoursParam = searchParams.get("hours");
        const dateParam = searchParams.get("date");

        if (hoursParam !== null) {
            const hours = Math.min(parseInt(hoursParam), 48);
            const { data: hourly, error } = await getWeatherNextHours(hours);

            if (error) return NextResponse.json({ error }, { status: 500 });
            if (!hourly?.length)
                return NextResponse.json(
                    { error: "No weather data found" },
                    { status: 404 },
                );

            return validateAndRespond(hourly, hourly[0].date);
        }

        const date = dateParam ?? getTodayLocalDateStr();
        const { data: hourly, error } = await getWeatherForDate(date);

        if (error) return NextResponse.json({ error }, { status: 500 });
        if (!hourly?.length)
            return NextResponse.json(
                { error: "No weather data found for this date" },
                { status: 404 },
            );

        return validateAndRespond(hourly, date);
    } catch (error) {
        console.error("[GET /api/weather]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
