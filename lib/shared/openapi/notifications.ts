// lib/openapi/notifications.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateNotificationInput,
    ListNotificationsQuery,
    NotificationListResponse,
    NotificationParamsSchema,
    MarkAllReadResponse,
    MarkOneReadResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerNotificationRoutes(registry: OpenAPIRegistry) {
    // GET /api/notifications
    registry.registerPath({
        method: "get",
        path: "/api/notifications",
        description: "Get notifications for the current user",
        summary:
            "Retrieve notifications with optional filtering by read status or type",
        tags: ["Notifications"],
        request: {
            query: ListNotificationsQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: NotificationListResponse },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // POST /api/notifications (internal use — cron + server triggers)
    registry.registerPath({
        method: "post",
        path: "/api/notifications",
        description: "Create a notification event (internal/server use only)",
        summary: "Create a new notification event for a role or specific user",
        tags: ["Notifications"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateNotificationInput },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: NotificationListResponse },
                },
            },
            400: {
                description: "Bad Request",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // PATCH /api/notifications/[id]/read
    registry.registerPath({
        method: "patch",
        path: "/api/notifications/{id}/read",
        description: "Mark a single notification as read for the current user",
        summary: "Mark one notification as read",
        tags: ["Notifications"],
        request: {
            params: NotificationParamsSchema,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: MarkOneReadResponse },
                },
            },
            404: {
                description: "Notification not found",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // PATCH /api/notifications/read-all
    registry.registerPath({
        method: "patch",
        path: "/api/notifications/read-all",
        description: "Mark all notifications as read for the current user",
        summary: "Mark all notifications as read",
        tags: ["Notifications"],
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: MarkAllReadResponse },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
