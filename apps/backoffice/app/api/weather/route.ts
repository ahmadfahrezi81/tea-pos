import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import {
    getTodayLocalDateStr,
    getWeatherForDate,
    getWeatherNextHours,
    WeatherHourlyRow,
} from "@tea-pos/services/weather";
import { WeatherHourlyResponse } from "@tea-pos/features/weather/schema";
import { ok, err, unauthorized, handleError } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

function buildPayload(hourly: WeatherHourlyRow[], date: string) {
    let tempMax = -Infinity, tempMin = Infinity, maxPrecip = 0;
    for (const h of hourly) {
        if (h.temperature > tempMax) tempMax = h.temperature;
        if (h.temperature < tempMin) tempMin = h.temperature;
        if (h.precipitationProbability > maxPrecip) maxPrecip = h.precipitationProbability;
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
        logger.error("GET /api/weather validation failed", parsed.error);
        return err("Invalid response shape");
    }
    return ok(parsed.data);
}

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();

        const { searchParams } = new URL(request.url);
        const hoursParam = searchParams.get("hours");
        const dateParam = searchParams.get("date");

        if (hoursParam !== null) {
            const hours = Math.min(parseInt(hoursParam), 48);
            const { data: hourly, error } = await getWeatherNextHours(supabase, hours);
            if (error) return err(error as string);
            if (!hourly?.length) return err("No weather data found", 404);
            return validateAndRespond(hourly, hourly[0].date);
        }

        const date = dateParam ?? getTodayLocalDateStr();
        const { data: hourly, error } = await getWeatherForDate(supabase, date);
        if (error) return err(error as string);
        if (!hourly?.length) return err("No weather data found for this date", 404);

        return validateAndRespond(hourly, date);
    } catch (error) {
        return handleError("GET /api/weather", error);
    }
}
