import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "../shared/common-schema";
import {
    GetCommissionRateQuery,
    CommissionRateResponse,
    UpsertCommissionConfigInput,
    CommissionConfigResponse,
} from "./schema";

export function registerCommissionConfigRoutes(registry: OpenAPIRegistry) {
    // GET /api/commission-configs
    registry.registerPath({
        method: "get",
        path: "/api/commission-configs",
        description: "Get effective commission rate for a user",
        summary: "Returns user-specific rate, falling back to tenant default if none exists",
        tags: ["Commission Configs"],
        request: { query: GetCommissionRateQuery },
        responses: {
            200: {
                description: "Effective rate for the user",
                content: { "application/json": { schema: CommissionRateResponse } },
            },
            400: { description: "Bad Request", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // POST /api/commission-configs
    registry.registerPath({
        method: "post",
        path: "/api/commission-configs",
        description: "Create or update commission config",
        summary: "Upserts a commission rate for a user (or tenant default if userId is null)",
        tags: ["Commission Configs"],
        request: {
            body: { content: { "application/json": { schema: UpsertCommissionConfigInput } } },
        },
        responses: {
            200: {
                description: "Config saved",
                content: { "application/json": { schema: CommissionConfigResponse } },
            },
            400: { description: "Bad Request", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });
}
