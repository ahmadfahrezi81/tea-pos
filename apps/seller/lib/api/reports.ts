import { apiFetch, buildParams } from "./client";
import type {
    CreateIncidentReportInput,
    IncidentReportResponse,
    IncidentReportListResponse,
} from "@tea-pos/features/reports/schema";

export const reportsApi = {
    list: async (params: { storeId: string; date?: string }) => {
        const sp = buildParams(params);
        return apiFetch<IncidentReportListResponse>(`/api/reports?${sp}`);
    },
    create: async (input: CreateIncidentReportInput) => {
        return apiFetch<IncidentReportResponse>("/api/reports", {
            method: "POST",
            body: JSON.stringify(input),
        });
    },
};
