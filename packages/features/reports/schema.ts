import { z } from "zod";
import { UUIDSchema } from "../shared/common-schema";

export const INCIDENT_CATEGORIES = ["equipment", "safety", "hygiene", "other"] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
    equipment: "Equipment",
    safety: "Safety",
    hygiene: "Hygiene",
    other: "Other",
};

export const CreateIncidentReportInput = z.object({
    storeId: UUIDSchema,
    dailySummaryId: UUIDSchema.optional(),
    category: z.enum(INCIDENT_CATEGORIES),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(1000),
    photoUrl: z.string().url().optional(),
});
export type CreateIncidentReportInput = z.infer<typeof CreateIncidentReportInput>;

export const ListIncidentReportsQuery = z.object({
    storeId: UUIDSchema,
    date: z.string().optional(),
});
export type ListIncidentReportsQuery = z.infer<typeof ListIncidentReportsQuery>;

export const IncidentReportResponse = z.object({
    id: z.string(),
    storeId: z.string(),
    dailySummaryId: z.string().nullable(),
    category: z.enum(INCIDENT_CATEGORIES),
    title: z.string(),
    description: z.string(),
    photoUrl: z.string().nullable(),
    status: z.enum(["open", "acknowledged", "resolved"]),
    createdAt: z.string(),
    userId: z.string(),
});
export type IncidentReportResponse = z.infer<typeof IncidentReportResponse>;

export const IncidentReportListResponse = z.object({
    reports: z.array(IncidentReportResponse),
});
export type IncidentReportListResponse = z.infer<typeof IncidentReportListResponse>;
