// lib/schemas/notifications.ts
import { z } from "zod";
import { UUIDSchema } from "./common";

/**
 * NAMING CONVENTION FOR SCHEMAS
 * ==============================
 *
 * Input Schemas (for POST/PUT/PATCH requests):
 *   - Format: {Action}{Entity}Input
 *   - Example: CreateNotificationInput, MarkNotificationReadInput
 *
 * Query Schemas (for GET request parameters):
 *   - Format: List{Entity}Query
 *   - Example: ListNotificationsQuery
 *
 * Response Schemas (for API responses):
 *   - Format: {Entity}Response or {Action}{Entity}Response
 *   - Example: NotificationResponse, NotificationListResponse
 */

// ============================================================================
// ENUMS
// ============================================================================

export const NotificationTypeSchema = z
    .enum(["weather_forecast", "store_opened"])
    .openapi({
        description: "Type of notification event",
        example: "weather_forecast",
    });

export const NotificationTargetRoleSchema = z
    .enum(["ADMIN", "manager", "seller", "USER"])
    .openapi({
        description: "Role that receives this notification broadcast",
        example: "ADMIN",
    });

export const NotificationParamsSchema = z
    .object({
        id: UUIDSchema,
    })
    .openapi({ title: "NotificationParams" });

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

export const CreateNotificationInput = z
    .object({
        tenantId: UUIDSchema,
        type: NotificationTypeSchema,
        title: z.string().min(1).max(255).openapi({
            description: "Short title of the notification",
            example: "Today's Weather Forecast",
        }),
        body: z.string().min(1).openapi({
            description: "Full body text of the notification",
            example: "Expect light rain in the afternoon. Plan accordingly!",
        }),
        metadata: z
            .record(z.string(), z.unknown())
            .nullable()
            .optional()
            .openapi({
                description:
                    "Additional data relevant to the notification type",
                example: { forecast_date: "2026-03-28", summary: "Light rain" },
            }),
        targetRole: NotificationTargetRoleSchema.nullable().optional().openapi({
            description:
                "Broadcast to all users of this role. Mutually exclusive with recipientId.",
        }),
        recipientId: UUIDSchema.nullable().optional().openapi({
            description:
                "Target a specific user. Mutually exclusive with targetRole.",
        }),
    })
    .refine((data) => !(data.targetRole && data.recipientId), {
        message: "targetRole and recipientId are mutually exclusive",
        path: ["recipientId"],
    })
    .openapi({ title: "CreateNotificationInput" });

export const MarkNotificationReadInput = z
    .object({
        notificationEventId: UUIDSchema,
    })
    .openapi({ title: "MarkNotificationReadInput" });

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

export const ListNotificationsQuery = z
    .object({
        isRead: z
            .enum(["true", "false"])
            .transform((val) => val === "true")
            .optional()
            .openapi({
                description: "Filter by read status. Omit to return all.",
                example: "false",
            }),
        type: NotificationTypeSchema.optional().openapi({
            description: "Filter by notification type",
        }),
    })
    .openapi({ title: "ListNotificationsQuery" });

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const NotificationResponse = z
    .object({
        id: UUIDSchema,
        tenantId: UUIDSchema,
        type: NotificationTypeSchema,
        title: z.string().openapi({
            description: "Short title of the notification",
            example: "Today's Weather Forecast",
        }),
        body: z.string().openapi({
            description: "Full body text of the notification",
            example: "Expect light rain in the afternoon.",
        }),
        metadata: z
            .record(z.string(), z.unknown())
            .nullable()
            .openapi({
                description:
                    "Additional data relevant to the notification type",
                example: { forecast_date: "2026-03-28" },
            }),
        targetRole: NotificationTargetRoleSchema.nullable().openapi({
            description: "Role this notification was broadcast to",
        }),
        recipientId: UUIDSchema.nullable().openapi({
            description: "Specific user this notification was targeted to",
        }),
        isRead: z.boolean().openapi({
            description: "Whether the current user has read this notification",
            example: false,
        }),
        readAt: z.string().nullable().openapi({
            description: "ISO timestamp of when the notification was read",
            example: "2026-03-28T06:00:00.000Z",
        }),
        createdAt: z.string().openapi({
            description: "ISO timestamp of when the notification was created",
            example: "2026-03-28T06:00:00.000Z",
        }),
    })
    .openapi({ title: "NotificationResponse" });

export const NotificationListResponse = z
    .object({
        notifications: z.array(NotificationResponse),
        unreadCount: z.number().int().min(0).openapi({
            description:
                "Total number of unread notifications for the current user",
            example: 3,
        }),
    })
    .openapi({ title: "NotificationListResponse" });

export const MarkAllReadResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        updatedCount: z.number().int().min(0).openapi({
            description: "Number of notifications marked as read",
            example: 5,
        }),
    })
    .openapi({ title: "MarkAllReadResponse" });

export const MarkOneReadResponse = z
    .object({
        success: z.boolean().openapi({ example: true }),
        notificationEventId: UUIDSchema,
        readAt: z.string().openapi({
            description: "ISO timestamp of when it was marked read",
            example: "2026-03-28T06:00:00.000Z",
        }),
    })
    .openapi({ title: "MarkOneReadResponse" });

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type NotificationTargetRole = z.infer<
    typeof NotificationTargetRoleSchema
>;
export type NotificationParams = z.infer<typeof NotificationParamsSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationInput>;
export type MarkNotificationReadInput = z.infer<
    typeof MarkNotificationReadInput
>;
export type ListNotificationsQuery = z.infer<typeof ListNotificationsQuery>;
export type NotificationResponse = z.infer<typeof NotificationResponse>;
export type NotificationListResponse = z.infer<typeof NotificationListResponse>;
export type MarkAllReadResponse = z.infer<typeof MarkAllReadResponse>;
export type MarkOneReadResponse = z.infer<typeof MarkOneReadResponse>;
