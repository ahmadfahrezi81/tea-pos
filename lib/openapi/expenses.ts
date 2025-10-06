// lib/openapi/expenses.ts
import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
    CreateExpenseInput,
    UpdateExpenseInput,
    ListExpensesQuery,
    ExpenseListResponse,
    CreateExpenseResponse,
    UpdateExpenseResponse,
    DeleteExpenseResponse,
    ErrorResponseSchema,
    DeleteByIdQuery,
} from "../schemas/index";

export function registerExpenseRoutes(registry: OpenAPIRegistry) {
    // Register GET /api/expenses
    registry.registerPath({
        method: "get",
        path: "/api/expenses",
        description: "Get expenses",
        summary: "Retrieve expenses with optional filtering",
        tags: ["Expenses"],
        request: {
            query: ListExpensesQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: ExpenseListResponse },
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

    // Register POST /api/expenses
    registry.registerPath({
        method: "post",
        path: "/api/expenses",
        description: "Create expense",
        summary: "Create a new expense",
        tags: ["Expenses"],
        request: {
            body: {
                content: { "application/json": { schema: CreateExpenseInput } },
            },
        },
        responses: {
            201: {
                description: "Created",
                content: {
                    "application/json": { schema: CreateExpenseResponse },
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

    // Register PUT /api/expenses
    registry.registerPath({
        method: "put",
        path: "/api/expenses",
        description: "Update expense",
        summary: "Update an existing expense",
        tags: ["Expenses"],
        request: {
            body: {
                content: { "application/json": { schema: UpdateExpenseInput } },
            },
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: UpdateExpenseResponse },
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

    // Register DELETE /api/expenses
    registry.registerPath({
        method: "delete",
        path: "/api/expenses",
        description: "Delete expense",
        summary: "Delete an expense by ID",
        tags: ["Expenses"],
        // request: {
        //     query: {
        //         type: "object",
        //         properties: {
        //             id: { type: "string", format: "uuid" },
        //         },
        //         required: ["id"],
        //     },
        // },
        request: {
            query: DeleteByIdQuery,
        },
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: DeleteExpenseResponse },
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
}
