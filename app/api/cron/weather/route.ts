// app/api/cron/weather/route.ts
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createNotification } from "@/lib/services/notifications";
import { createRouteHandlerClient } from "@/lib/supabase/server";

// ============================================================================
// Time windows per slot (SGT = UTC+7, capped at 22:00)
// ============================================================================
const SLOT_WINDOWS = {
    morning: { label: "Morning", from: 6, to: 16 },
    midday: { label: "Midday", from: 10, to: 20 },
    afternoon: { label: "Afternoon", from: 14, to: 24 },
} as const;

type WeatherSlot = keyof typeof SLOT_WINDOWS;

interface HourlyWeather {
    time: string;
    temperature: number;
    precipitationProbability: number;
    weatherCode: number;
}

// ============================================================================
// Location config — swap for dynamic lookup later if needed
// ============================================================================
const LOCATION = {
    lat: -6.602113395775711,
    lng: 106.76555869284739,
    city: "Ciomas",
    region: "Bogor",
} as const;

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
            `https://api.tomorrow.io/v4/weather/forecast?location=${LOCATION.lat},${LOCATION.lng}&timesteps=1h&apikey=${apiKey}`,
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

        // Filter to local hours within the slot window
        // tomorrow.io returns UTC — offset from env
        const todayLocal = new Date();
        const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
        const todayDateStr = new Date(
            todayLocal.getTime() + tzOffset * 60 * 60 * 1000,
        )
            .toISOString()
            .split("T")[0];

        const filtered: HourlyWeather[] = hourlyData
            .filter((hour: { time: string }) => {
                const utcDate = new Date(hour.time);
                const localHour = (utcDate.getUTCHours() + tzOffset) % 24;
                const localDateStr = new Date(
                    utcDate.getTime() + tzOffset * 60 * 60 * 1000,
                )
                    .toISOString()
                    .split("T")[0];
                return (
                    localDateStr === todayDateStr &&
                    localHour >= window.from &&
                    localHour <= window.to
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

        const localDate = new Date(
            new Date(filtered[0].time).getTime() + tzOffset * 60 * 60 * 1000,
        );
        const forecastDate = format(localDate, "yyyy-MM-dd");
        const prettyDate = format(localDate, "EEE, MMM d");

        const rainLine =
            maxRain === 0
                ? `0% chance of rain — all clear. Tap to view the full forecast.`
                : maxRain <= 20
                  ? `Up to ${maxRain}% chance of rain — conditions looking good. Tap to view the full forecast.`
                  : maxRain <= 50
                    ? `Up to ${maxRain}% chance of rain — expect some showers. Tap to view the full forecast.`
                    : `Up to ${maxRain}% chance of rain — heavy rain likely. Tap to view the full forecast.`;

        const title = `${window.label} · ${prettyDate}`;
        const body = rainLine;

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
                        location: {
                            lat: LOCATION.lat,
                            lng: LOCATION.lng,
                            city: LOCATION.city,
                            region: LOCATION.region,
                        },
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
            location: `${LOCATION.city}, ${LOCATION.region}`,
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
