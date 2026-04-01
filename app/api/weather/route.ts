import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import {
    getTodayLocalDateStr,
    getWeatherForDate,
} from "@/lib/services/weather";
import { WeatherHourlyResponse } from "@/lib/schemas/weather";

// ============================================================================
// GET /api/weather?date=yyyy-MM-dd (date defaults to today)
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        // ─── Auth ─────────────────────────────────────────────────────
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

        // ─── Parse date param ──────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date") ?? getTodayLocalDateStr();

        // ─── Fetch from DB ─────────────────────────────────────────────
        const { data: hourly, error } = await getWeatherForDate(date);

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        if (!hourly || hourly.length === 0) {
            return NextResponse.json(
                { error: "No weather data found for this date" },
                { status: 404 },
            );
        }

        // ─── Shape response ────────────────────────────────────────────
        const temps = hourly.map((h) => h.temperature);

        const payload = {
            date,
            city: hourly[0].city,
            region: hourly[0].region,
            hourly,
            tempMax: Math.max(...temps),
            tempMin: Math.min(...temps),
            maxPrecipitationProbability: Math.max(
                ...hourly.map((h) => h.precipitationProbability),
            ),
        };

        const parsed = WeatherHourlyResponse.safeParse(payload);

        if (!parsed.success) {
            console.error(
                "[GET /api/weather] Validation failed:",
                parsed.error,
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("[GET /api/weather]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
