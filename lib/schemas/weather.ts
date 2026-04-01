import { z } from "zod";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: UpsertWeatherHourlyInput
 *
 * Query Schemas (for GET request parameters):
 *   - Format: List{Entity}Query
 *   - Example: ListWeatherHourlyQuery
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: WeatherHourlyResponse, WeatherDayResponse
 */

// ============================================================================
// ENUMS
// ============================================================================

export const WeatherSlotSchema = z
    .enum(["dawn", "morning", "midday", "afternoon", "evening"])
    .openapi({
        description: "Time slot for weather notification",
        example: "morning",
    });

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const WeatherHourlyRowSchema = z
    .object({
        id: z.string().uuid(),
        date: z.string().openapi({
            description: "Forecast date in yyyy-MM-dd format",
            example: "2026-04-01",
        }),
        hour: z.number().int().min(0).max(23).openapi({
            description: "Local hour (0–23)",
            example: 14,
        }),
        temperature: z.number().openapi({
            description: "Temperature in °C",
            example: 28.5,
        }),
        precipitationProbability: z.number().openapi({
            description: "Precipitation probability as a percentage (0–100)",
            example: 60,
        }),
        weatherCode: z.number().int().openapi({
            description: "Tomorrow.io weather code",
            example: 1001,
        }),
        lat: z.number().openapi({ example: -6.602 }),
        lng: z.number().openapi({ example: 106.765 }),
        city: z.string().openapi({ example: "Ciomas" }),
        region: z.string().openapi({ example: "Bogor" }),
        fetchedAt: z.string().openapi({
            description: "ISO timestamp of when this row was last fetched",
            example: "2026-04-01T07:30:00.000Z",
        }),
        createdAt: z.string().openapi({
            description: "ISO timestamp of when this row was first created",
            example: "2026-04-01T05:30:00.000Z",
        }),
    })
    .openapi({ title: "WeatherHourlyRow" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListWeatherHourlyQuery = z
    .object({
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .openapi({
                description:
                    "Date to fetch hourly weather for. Defaults to today.",
                example: "2026-04-01",
            }),
    })
    .openapi({ title: "ListWeatherHourlyQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const WeatherHourlyResponse = z
    .object({
        date: z.string().openapi({
            description: "Forecast date in yyyy-MM-dd format",
            example: "2026-04-01",
        }),
        city: z.string().openapi({ example: "Ciomas" }),
        region: z.string().openapi({ example: "Bogor" }),
        hourly: z.array(WeatherHourlyRowSchema).openapi({
            description: "Hourly weather rows for the requested date",
        }),
        tempMax: z.number().openapi({ example: 32 }),
        tempMin: z.number().openapi({ example: 24 }),
        maxPrecipitationProbability: z.number().openapi({ example: 80 }),
    })
    .openapi({ title: "WeatherHourlyResponse" });

export const WeatherFetchResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        date: z.string().openapi({ example: "2026-04-01" }),
        hoursUpserted: z.number().int().openapi({ example: 12 }),
        hoursSkipped: z.number().int().openapi({
            description:
                "Past hours that were skipped to preserve immutability",
            example: 5,
        }),
    })
    .openapi({ title: "WeatherFetchResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WeatherSlot = z.infer<typeof WeatherSlotSchema>;
export type WeatherHourlyRow = z.infer<typeof WeatherHourlyRowSchema>;
export type ListWeatherHourlyQuery = z.infer<typeof ListWeatherHourlyQuery>;
export type WeatherHourlyResponse = z.infer<typeof WeatherHourlyResponse>;
export type WeatherFetchResponse = z.infer<typeof WeatherFetchResponse>;
