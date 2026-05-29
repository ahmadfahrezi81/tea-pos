import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "../shared/common-schema";
import {
    ListPayrollPeriodsQuery,
    PayrollPeriodListResponse,
    PayrollPeriodResponse,
    UpdatePayrollPeriodInput,
    ListPayrollEntriesQuery,
    PayrollEntryListResponse,
    PayrollEntryResponse,
    UpdatePayrollEntryInput,
} from "./schema";

export function registerPayrollRoutes(registry: OpenAPIRegistry) {
    // GET /api/payroll/periods
    registry.registerPath({
        method: "get",
        path: "/api/payroll/periods",
        description: "List payroll periods",
        summary: "Returns all payroll periods for the tenant, optionally filtered by status",
        tags: ["Payroll"],
        request: { query: ListPayrollPeriodsQuery },
        responses: {
            200: {
                description: "List of payroll periods",
                content: { "application/json": { schema: PayrollPeriodListResponse } },
            },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // PATCH /api/payroll/periods/[id]
    registry.registerPath({
        method: "patch",
        path: "/api/payroll/periods/{id}",
        description: "Update payroll period status",
        summary: "Advance a payroll period status (open → processing → paid)",
        tags: ["Payroll"],
        request: {
            body: { content: { "application/json": { schema: UpdatePayrollPeriodInput } } },
        },
        responses: {
            200: {
                description: "Updated period",
                content: { "application/json": { schema: PayrollPeriodResponse } },
            },
            404: { description: "Period not found", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // GET /api/payroll/entries
    registry.registerPath({
        method: "get",
        path: "/api/payroll/entries",
        description: "List payroll entries",
        summary: "Returns payroll entries optionally filtered by period or user",
        tags: ["Payroll"],
        request: { query: ListPayrollEntriesQuery },
        responses: {
            200: {
                description: "List of payroll entries",
                content: { "application/json": { schema: PayrollEntryListResponse } },
            },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // PATCH /api/payroll/entries/[id]
    registry.registerPath({
        method: "patch",
        path: "/api/payroll/entries/{id}",
        description: "Update payroll entry status",
        summary: "Approve or mark a payroll entry as paid",
        tags: ["Payroll"],
        request: {
            body: { content: { "application/json": { schema: UpdatePayrollEntryInput } } },
        },
        responses: {
            200: {
                description: "Updated entry",
                content: { "application/json": { schema: PayrollEntryResponse } },
            },
            404: { description: "Entry not found", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });
}
