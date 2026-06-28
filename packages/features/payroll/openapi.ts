import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "../shared/common-schema";
import {
    ListPayrollPeriodsQuery,
    PayrollPeriodListResponse,
    PayrollPeriodResponse,
    UpdatePayrollPeriodInput,
    ListPayrollCommissionsQuery,
    PayrollCommissionListResponse,
    PayrollCommissionResponse,
    UpdatePayrollCommissionInput,
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

    // GET /api/payroll/commissions
    registry.registerPath({
        method: "get",
        path: "/api/payroll/commissions",
        description: "List payroll commissions",
        summary: "Returns payroll commissions optionally filtered by period or user",
        tags: ["Payroll"],
        request: { query: ListPayrollCommissionsQuery },
        responses: {
            200: {
                description: "List of payroll commissions",
                content: { "application/json": { schema: PayrollCommissionListResponse } },
            },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });

    // PATCH /api/payroll/commissions/[id]
    registry.registerPath({
        method: "patch",
        path: "/api/payroll/commissions/{id}",
        description: "Update payroll commission status",
        summary: "Approve or mark a payroll commission as paid",
        tags: ["Payroll"],
        request: {
            body: { content: { "application/json": { schema: UpdatePayrollCommissionInput } } },
        },
        responses: {
            200: {
                description: "Updated commission",
                content: { "application/json": { schema: PayrollCommissionResponse } },
            },
            404: { description: "Commission not found", content: { "application/json": { schema: ErrorResponseSchema } } },
            500: { description: "Internal Server Error", content: { "application/json": { schema: ErrorResponseSchema } } },
        },
    });
}
