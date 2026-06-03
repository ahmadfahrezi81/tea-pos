import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

export interface CreateReimbursementParams {
    tenantId: string;
    userId: string;
    type: string;
    amount: number;
    date: string;
    storeId?: string;
    notes?: string;
    photoUrl?: string;
}

export async function createReimbursement(
    supabase: SupabaseClient,
    params: CreateReimbursementParams,
) {
    const { tenantId, userId, type, amount, date, storeId, notes, photoUrl } = params;

    const { data, error } = await supabase
        .from("payroll_reimbursements")
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            store_id: storeId ?? null,
            type,
            amount,
            date,
            notes: notes ?? null,
            photo_url: photoUrl ?? null,
        })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create reimbursement");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("reimbursement_submitted", {
        refId: (data as { id: string }).id,
        refTable: "payroll_reimbursements",
        metadata: { type, amount, date },
    });

    return toCamelKeys(data);
}

export async function updateReimbursementStatus(
    supabase: SupabaseClient,
    { id, tenantId, actorId, status }: { id: string; tenantId: string; actorId: string; status: "approved" | "rejected" },
) {
    const { data, error } = await supabase
        .from("payroll_reimbursements")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Reimbursement not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("reimbursement_status_updated", { refId: id, refTable: "payroll_reimbursements", metadata: { status } });

    return toCamelKeys(data);
}

export async function listAllReimbursements(
    supabase: SupabaseClient,
    { tenantId, status }: { tenantId: string; status?: string },
) {
    let query = supabase
        .from("payroll_reimbursements")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export interface ListMyReimbursementsParams {
    tenantId: string;
    userId: string;
    limit?: number;
}

export async function listMyReimbursements(
    supabase: SupabaseClient,
    { tenantId, userId, limit }: ListMyReimbursementsParams,
) {
    let query = supabase
        .from("payroll_reimbursements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return toCamelKeys(data ?? []);
}
