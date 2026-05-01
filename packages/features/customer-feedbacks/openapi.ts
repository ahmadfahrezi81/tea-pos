import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateCustomerFeedbackInput,
    ListCustomerFeedbacksQuery,
    CustomerFeedbackResponse,
    CreateCustomerFeedbackResponse,
    ListCustomerFeedbacksResponse,
} from "../schemas/index";
import { ErrorResponseSchema } from "../schemas/common";

export function registerCustomerFeedbackRoutes(registry: OpenAPIRegistry) {
    // GET /api/customer-feedbacks
    registry.registerPath({
        method: "get",
        path: "/api/customer-feedbacks",
        description: "Get a list of customer feedbacks with optional filters",
        summary: "List customer feedbacks",
        tags: ["Customer Feedbacks"],
        request: {
            query: ListCustomerFeedbacksQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": {
                        schema: ListCustomerFeedbacksResponse,
                    },
                },
            },
            401: {
                description: "Unauthorized",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
            500: {
                description: "Internal server error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });

    // POST /api/customer-feedbacks
    registry.registerPath({
        method: "post",
        path: "/api/customer-feedbacks",
        description: "Submit a new customer feedback entry with location data",
        summary: "Create a customer feedback",
        tags: ["Customer Feedbacks"],
        request: {
            body: {
                content: {
                    "application/json": { schema: CreateCustomerFeedbackInput },
                },
            },
        },
        responses: {
            201: {
                description: "Feedback created successfully",
                content: {
                    "application/json": {
                        schema: CreateCustomerFeedbackResponse,
                    },
                },
            },
            400: {
                description: "Invalid request body",
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
                description: "Internal server error",
                content: {
                    "application/json": { schema: ErrorResponseSchema },
                },
            },
        },
    });
}
