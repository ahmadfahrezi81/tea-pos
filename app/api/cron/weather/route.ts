// app/api/cron/weather/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createNotification } from "@/lib/services/notifications";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// ============================================================================
// Time windows per slot (SGT = UTC+7, capped at 22:00)
// ============================================================================
const SLOT_WINDOWS = {
    morning: { label: "Morning", from: 6, to: 22 },
    midday: { label: "Midday", from: 12, to: 22 },
    afternoon: { label: "Afternoon", from: 17, to: 22 },
} as const;

type WeatherSlot = keyof typeof SLOT_WINDOWS;

interface HourlyWeather {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
}

// ============================================================================
// GET /api/cron/weather?slot=morning|midday|afternoon
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        // Auth check
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Validate slot
        const { searchParams } = new URL(request.url);
        const slot = searchParams.get("slot") as WeatherSlot | null;

        if (!slot || !SLOT_WINDOWS[slot]) {
            return NextResponse.json(
                {
                    error: "Invalid or missing slot. Use: morning, midday, afternoon",
                },
                { status: 400 },
            );
        }

        const apiKey = process.env.TOMORROW_IO_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Missing TOMORROW_IO_API_KEY" },
                { status: 500 },
            );
        }

        const window = SLOT_WINDOWS[slot];

        // Fetch hourly forecast from tomorrow.io
        const weatherRes = await fetch(
            `https://api.tomorrow.io/v4/weather/forecast?location=3.1390,101.6869&timesteps=1h&apikey=${apiKey}`,
        );

        if (!weatherRes.ok) {
            return NextResponse.json(
                { error: "Failed to fetch weather data" },
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

        // Filter to SGT hours within the slot window
        // tomorrow.io returns UTC — SGT is UTC+7
        const todaySGT = new Date();
        const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
        const todayDateStr = new Date(
            todaySGT.getTime() + tzOffset * 60 * 60 * 1000,
        )
            .toISOString()
            .split("T")[0];

        const filtered: HourlyWeather[] = hourlyData
            .filter((hour: { time: string }) => {
                const utcDate = new Date(hour.time);
                const sgtHour = (utcDate.getUTCHours() + tzOffset) % 24;
                const sgtDateStr = new Date(
                    utcDate.getTime() + tzOffset * 60 * 60 * 1000,
                )
                    .toISOString()
                    .split("T")[0];
                return (
                    sgtDateStr === todayDateStr &&
                    sgtHour >= window.from &&
                    sgtHour <= window.to
                );
            })
            .map((hour: { time: string; values: Record<string, number> }) => ({
                time: hour.time,
                temperature: Math.round(hour.values?.temperature ?? 0),
                precipitationProbability: Math.round(
                    hour.values?.precipitationProbability ?? 0,
                ),
                weatherCode: hour.values?.weatherCode ?? 1000,
            }));

        if (filtered.length === 0) {
            return NextResponse.json(
                { error: "No hourly data within slot window" },
                { status: 500 },
            );
        }

        // Summary values from the filtered window
        const temps = filtered.map((h) => h.temperature);
        const tempMax = Math.max(...temps);
        const tempMin = Math.min(...temps);
        const maxRain = Math.max(
            ...filtered.map((h) => h.precipitationProbability),
        );
        const forecastDate = new Date(filtered[0].time)
            .toISOString()
            .split("T")[0];

        const title = `${window.label} Forecast — ${forecastDate}`;
        const body = `High ${tempMax}°C · Low ${tempMin}°C · Up to ${maxRain}% chance of rain`;

        // Fetch all tenants
        const supabase = await createRouteHandlerClient();
        const { data: tenants, error: tenantsError } = await supabase
            .from("tenants")
            .select("id");

        if (tenantsError || !tenants) {
            return NextResponse.json(
                { error: "Failed to fetch tenants" },
                { status: 500 },
            );
        }

        // Send one notification per tenant
        const results = await Promise.allSettled(
            tenants.map((tenant) =>
                createNotification({
                    tenantId: tenant.id,
                    type: "weather_forecast",
                    title,
                    body,
                    metadata: {
                        slot,
                        forecast_date: forecastDate,
                        temp_max: tempMax,
                        temp_min: tempMin,
                        max_rain_probability: maxRain,
                        window_from: window.from,
                        window_to: window.to,
                        hourly: filtered,
                    },
                }),
            ),
        );

        const failed = results.filter((r) => r.status === "rejected").length;
        const succeeded = results.filter(
            (r) => r.status === "fulfilled",
        ).length;

        return NextResponse.json({
            success: true,
            slot,
            hoursIncluded: filtered.length,
            summary: `${succeeded} tenant(s) notified, ${failed} failed`,
        });
    } catch (error) {
        console.error("[cron/weather]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
