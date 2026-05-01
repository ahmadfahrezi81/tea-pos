// lib/openapi/daily-summaries.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateDailySummaryInput,
    UpdateDailySummaryInput,
    ListDailySummariesQuery,
    DailySummaryListResponse,
    CreateDailySummaryResponse,
    UpdateDailySummaryResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerDailySummaryRoutes(registry: OpenAPIRegistry) {
    // GET /api/summaries
    registry.registerPath({
        method: "get",
        path: "/api/summaries",
        description: "Get daily summaries",
        summary: "Retrieve daily summaries with expenses, photos and analytics",
        tags: ["Daily Summaries"],
        request: {
            query: ListDailySummariesQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DailySummaryListResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // POST /api/summaries
    registry.registerPath({
        method: "post",
        path: "/api/summaries",
        description: "Create daily summary",
        summary:
            "Create a new daily summary for a store with optional opening cash breakdown",
        tags: ["Daily Summaries"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateDailySummaryInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateDailySummaryResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            409: {
                description: "Conflict - Summary already exists for this date",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // PUT /api/summaries
    registry.registerPath({
        method: "put",
        path: "/api/summaries",
        description: "Update daily summary",
        summary:
            "Update an existing daily summary — supports opening/closing cash breakdown and close day",
        tags: ["Daily Summaries"],
        request: {
            body: {
                content: {
                    "application/json": { schema: UpdateDailySummaryInput },
                },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateDailySummaryResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            404: {
                description: "Not Found",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
