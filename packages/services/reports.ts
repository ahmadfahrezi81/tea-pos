import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

export interface CreateIncidentReportParams {
    tenantId: string;
    storeId: string;
    userId: string;
    dailySummaryId?: string;
    type: string;
    notes: string;
    photoUrl?: string;
}

export async function createIncidentReport(
    supabase: SupabaseClient,
    params: CreateIncidentReportParams,
) {
    const { tenantId, storeId, userId, dailySummaryId, type, notes, photoUrl } = params;

    const { data, error } = await supabase
        .from("incident_reports")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            user_id: userId,
            daily_summary_id: dailySummaryId ?? null,
            type,
            notes,
            photo_url: photoUrl ?? null,
        })
        .select()
        .single();

    if (error) throw error;

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("incident_report_created", { refId: data.id, refTable: "incident_reports", metadata: { type } });

    return toCamelKeys(data);
}

export interface ListIncidentReportsParams {
    tenantId: string;
    storeId: string;
    date?: string;
}

export async function listIncidentReports(
    supabase: SupabaseClient,
    params: ListIncidentReportsParams,
) {
    const { tenantId, storeId, date } = params;

    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    const targetDate = date ?? new Date(Date.now() + tz * 3600000).toISOString().split("T")[0];

    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = `${targetDate}T23:59:59.999Z`;

    const startUtc = new Date(new Date(dayStart).getTime() - tz * 3600000).toISOString();
    const endUtc = new Date(new Date(dayEnd).getTime() - tz * 3600000).toISOString();

    const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(toCamelKeys);
}
