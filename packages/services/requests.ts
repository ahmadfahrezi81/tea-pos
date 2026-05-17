import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

export interface CreateSupplyRequestParams {
    tenantId: string;
    storeId: string;
    userId: string;
    type: string;
    notes?: string;
    photoUrl?: string;
    dailySummaryId?: string;
}

export async function createSupplyRequest(
    supabase: SupabaseClient,
    params: CreateSupplyRequestParams,
) {
    const { tenantId, storeId, userId, type, notes, photoUrl, dailySummaryId } = params;

    const { data, error } = await supabase
        .from("supply_requests")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            user_id: userId,
            type,
            notes: notes ?? null,
            photo_url: photoUrl ?? null,
            daily_summary_id: dailySummaryId ?? null,
        })
        .select()
        .single();

    if (error) throw error;

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("supply_request_created", { refId: data.id, refTable: "supply_requests", metadata: { type } });

    return toCamelKeys(data);
}

export interface ListSupplyRequestsParams {
    tenantId: string;
    storeId: string;
    date?: string;
}

export async function listSupplyRequests(
    supabase: SupabaseClient,
    params: ListSupplyRequestsParams,
) {
    const { tenantId, storeId, date } = params;

    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    const targetDate = date ?? new Date(Date.now() + tz * 3600000).toISOString().split("T")[0];

    const dayStart = `${targetDate}T00:00:00.000Z`;
    const dayEnd = `${targetDate}T23:59:59.999Z`;

    // Convert UTC+7 day boundaries to UTC for DB query
    const startUtc = new Date(new Date(dayStart).getTime() - tz * 3600000).toISOString();
    const endUtc = new Date(new Date(dayEnd).getTime() - tz * 3600000).toISOString();

    const { data, error } = await supabase
        .from("supply_requests")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(toCamelKeys);
}
