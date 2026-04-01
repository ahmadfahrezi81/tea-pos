import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    ListWeatherHourlyQuery,
    WeatherHourlyResponse,
    WeatherFetchResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerWeatherRoutes(registry: OpenAPIRegistry) {
    // GET /api/weather
    registry.registerPath({
        method: "get",
        path: "/api/weather",
        description: "Get hourly weather data for a given date",
        summary: "Retrieve hourly weather rows for today or a specific date",
        tags: ["Weather"],
        request: {
            query: ListWeatherHourlyQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: WeatherHourlyResponse },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            404: {
                description: "No weather data found for the requested date",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // GET /api/cron/weather/fetch
    registry.registerPath({
        method: "get",
        path: "/api/cron/weather/fetch",
        description:
            "Fetch latest hourly forecast from Tomorrow.io and upsert into DB. Skips past hours to preserve immutability.",
        summary: "Cron job — fetch and upsert weather data (internal only)",
        tags: ["Weather", "Cron"],
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: WeatherFetchResponse },
                },
            },
            401: {
                description: "Unauthorized — missing or invalid CRON_SECRET",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Failed to fetch or upsert weather data",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // GET /api/cron/weather/notify
    registry.registerPath({
        method: "get",
        path: "/api/cron/weather/notify",
        description:
            "Read latest weather data from DB and send reminder notification to all tenants. Runs 3x/day.",
        summary:
            "Cron job — send weather reminder notification (internal only)",
        tags: ["Weather", "Cron"],
        request: {
            query: ListWeatherHourlyQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: WeatherFetchResponse },
                },
            },
            401: {
                description: "Unauthorized — missing or invalid CRON_SECRET",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "No weather data found or notification failed",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
