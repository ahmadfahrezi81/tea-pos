import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/services/notifications";
import {
    getTodayLocalDateStr,
    getWeatherForDate,
    buildRainLine,
} from "@/lib/services/weather";

// ============================================================================
// GET /api/cron/weather/notify
// Runs 3x/day — reads latest weather from DB and sends reminder notification.
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

        // ─── Read today's weather from DB ──────────────────────────────
        const todayDateStr = getTodayLocalDateStr();
        const { data: hourly, error: weatherError } =
            await getWeatherForDate(todayDateStr);

        if (weatherError || !hourly || hourly.length === 0) {
            return NextResponse.json(
                { error: "No weather data available for today" },
                { status: 500 },
            );
        }

        // ─── Build notification content ────────────────────────────────
        const temps = hourly.map((h) => h.temperature);
        const maxRain = Math.max(
            ...hourly.map((h) => h.precipitationProbability),
        );
        const prettyDate = format(new Date(todayDateStr), "EEE, MMM d");
        const { title, body } = buildRainLine(maxRain, prettyDate);

        // ─── Fetch all tenants ─────────────────────────────────────────
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

        // ─── Send one notification per tenant ──────────────────────────
        const results = await Promise.allSettled(
            tenants.map((tenant) =>
                createNotification({
                    tenantId: tenant.id,
                    type: "weather_forecast",
                    title,
                    body,
                    metadata: {
                        forecast_date: todayDateStr,
                        temp_max: Math.max(...temps),
                        temp_min: Math.min(...temps),
                        max_rain_probability: maxRain,
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
            date: todayDateStr,
            summary: `${succeeded} tenant(s) notified, ${failed} failed`,
        });
    } catch (error) {
        console.error("[cron/weather/notify]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
