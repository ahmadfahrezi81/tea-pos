import { NextRequest } from "next/server";
import { format } from "date-fns";
import { getServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@tea-pos/services/notifications";
import {
    getTodayLocalDateStr,
    getWeatherForDate,
    buildRainLine,
} from "@tea-pos/services/weather";
import { ok, err, unauthorized } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return unauthorized();

        const supabase = getServiceClient();

        const todayDateStr = getTodayLocalDateStr();
        const { data: hourly, error: weatherError } = await getWeatherForDate(supabase, todayDateStr);

        if (weatherError || !hourly || hourly.length === 0) {
            return err("No weather data available for today");
        }

        const temps = hourly.map((h) => h.temperature);
        const maxRain = Math.max(...hourly.map((h) => h.precipitationProbability));
        const prettyDate = format(new Date(todayDateStr), "EEE, MMM d");
        const { title, body } = buildRainLine(maxRain, prettyDate);

        const { data: tenants, error: tenantsError } = await supabase
            .from("tenants")
            .select("id");

        if (tenantsError || !tenants) return err("Failed to fetch tenants");

        const results = await Promise.allSettled(
            tenants.map((tenant) =>
                createNotification(supabase, {
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
        const succeeded = results.filter((r) => r.status === "fulfilled").length;

        if (failed > 0) {
            logger.error(`GET /api/cron/weather/notify ${failed} tenant(s) failed`);
        }

        return ok({
            success: true,
            date: todayDateStr,
            summary: `${succeeded} tenant(s) notified, ${failed} failed`,
        });
    } catch (error) {
        logger.error("GET /api/cron/weather/notify", error);
        return err("Internal server error");
    }
}
