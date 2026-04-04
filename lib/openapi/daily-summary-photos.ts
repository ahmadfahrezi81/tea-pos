// lib/openapi/daily-summary-photos.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    UploadSummaryPhotoInput,
    UploadSummaryPhotoResponse,
    DeleteSummaryPhotoResponse,
    ListSummaryPhotosQuery,
    ListSummaryPhotosResponse,
    ErrorResponseSchema,
} from "../schemas/index";

export function registerDailySummaryPhotoRoutes(registry: OpenAPIRegistry) {
    // POST /api/summaries/photo
    registry.registerPath({
        method: "post",
        path: "/api/summaries/photo",
        description: "Upload summary photo",
        summary:
            "Upload a photo for a daily summary — opening, closing, or expense. Accepts WebP or JPEG.",
        tags: ["Daily Summary Photos"],
        request: {
            body: {
                content: {
                    "multipart/form-data": {
                        schema: UploadSummaryPhotoInput,
                    },
                },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: UploadSummaryPhotoResponse },
                },
            },
            400: {
                description:
                    "Bad Request - Invalid file type or missing fields",
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
            500: {
                description: "Internal Server Error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // GET /api/summaries/photo
    registry.registerPath({
        method: "get",
        path: "/api/summaries/photo",
        description: "Get summary photos",
        summary: "Retrieve photos for a daily summary or expense",
        tags: ["Daily Summary Photos"],
        request: {
            query: ListSummaryPhotosQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: ListSummaryPhotosResponse },
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

    // DELETE /api/summaries/photo
    registry.registerPath({
        method: "delete",
        path: "/api/summaries/photo",
        description: "Delete summary photo",
        summary: "Delete a photo by ID — also removes from Supabase storage",
        tags: ["Daily Summary Photos"],
        request: {
            query: ListSummaryPhotosQuery.pick({ dailySummaryId: true }).extend(
                {
                    id: UploadSummaryPhotoInput.shape.dailySummaryId,
                },
            ),
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DeleteSummaryPhotoResponse },
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
