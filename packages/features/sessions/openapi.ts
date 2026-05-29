import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "../shared/common-schema";
import {
    OpenStoreInput,
    OpenStoreResponse,
    TransferSessionInput,
    StoreSessionResponse,
    GetActiveSessionQuery,
} from "./schema";

export function registerSessionRoutes(registry: OpenAPIRegistry) {
    // GET /api/sessions
    registry.registerPath({
        method: "get",
        path: "/api/sessions",
        description: "Get active session for a store",
        summary: "Returns the current active store session, or null if none",
        tags: ["Sessions"],
        request: { query: GetActiveSessionQuery },
        responses: {
            200: {
                description: "Active session or null",
                content: { "application/json": { schema: StoreSessionResponse } },
            },
            400: { description: "Bad Request", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // POST /api/sessions — open store (creates daily_summary + session)
    registry.registerPath({
        method: "post",
        path: "/api/sessions",
        description: "Open store",
        summary: "Creates a daily summary and claims the first session for the day",
        tags: ["Sessions"],
        request: {
            body: { content: { "application/json": { schema: OpenStoreInput } } },
        },
        responses: {
            201: {
                description: "Store opened — session + daily summary returned",
                content: { "application/json": { schema: OpenStoreResponse } },
            },
            400: { description: "Bad Request", content: { "application/json": { schema: ErrorResponseSchema } } },
            409: { description: "Store already opened for this date", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // POST /api/sessions/transfer
    registry.registerPath({
        method: "post",
        path: "/api/sessions/transfer",
        description: "Transfer session",
        summary: "Validates claim code, ends current session, and creates a new one for the requesting user",
        tags: ["Sessions"],
        request: {
            body: { content: { "application/json": { schema: TransferSessionInput } } },
        },
        responses: {
            200: {
                description: "New session created",
                content: { "application/json": { schema: StoreSessionResponse } },
            },
            403: { description: "Invalid claim code", content: { "application/json": { schema: ErrorResponseSchema } } },
            404: { description: "No active session", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // PATCH /api/sessions/[id] — end session
    registry.registerPath({
        method: "patch",
        path: "/api/sessions/{id}",
        description: "End session",
        summary: "Marks a session as ended",
        tags: ["Sessions"],
        request: { params: OpenStoreInput.pick({ storeId: true }).partial() },
        responses: {
            200: {
                description: "Session ended",
                content: { "application/json": { schema: StoreSessionResponse } },
            },
            404: { description: "Session not found", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });
}
