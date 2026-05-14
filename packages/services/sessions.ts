import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

function generateClaimCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Open store ───────────────────────────────────────────────────────────────
// Sequential: creates daily_summary first, then store_session with the returned id.

export interface OpenStoreParams {
    tenantId: string;
    storeId: string;
    userId: string;
    date: string;
    openingBalance?: number;
    openingCashBreakdown?: unknown;
}

export async function openStore(supabase: SupabaseClient, params: OpenStoreParams) {
    const { tenantId, storeId, userId, date, openingBalance = 0, openingCashBreakdown } = params;

    const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, tenant_id")
        .eq("id", storeId)
        .eq("tenant_id", tenantId)
        .single();

    if (storeError || !store) throw new Error("Store not found or access denied");

    const { count, error: existsError } = await supabase
        .from("daily_summaries")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("date", date)
        .eq("tenant_id", tenantId);

    if (existsError) throw existsError;
    if ((count ?? 0) > 0)
        throw Object.assign(new Error("Store already opened for this date"), { status: 409 });

    const { data: summaryData, error: summaryError } = await supabase
        .from("daily_summaries")
        .insert({
            store_id: storeId,
            tenant_id: tenantId,
            opened_by: userId,
            closed_by: userId,
            date,
            opening_balance: openingBalance,
            opening_cash_breakdown: openingCashBreakdown ?? null,
            total_sales: 0,
            total_orders: 0,
            total_cups: 0,
            total_expenses: 0,
            expected_cash: openingBalance,
        })
        .select()
        .single();

    if (summaryError || !summaryData) throw new Error(summaryError?.message ?? "Failed to create daily summary");

    const dailySummaryId = (summaryData as { id: string }).id;

    const { data: sessionData, error: sessionError } = await supabase
        .from("store_sessions")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            daily_summary_id: dailySummaryId,
            user_id: userId,
            claim_code: generateClaimCode(),
        })
        .select()
        .single();

    if (sessionError || !sessionData) throw new Error(sessionError?.message ?? "Failed to create session");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("store_open", {
        refId: dailySummaryId,
        refTable: "daily_summaries",
        metadata: { date, opening_balance: openingBalance },
    });

    return {
        session: toCamelKeys(sessionData),
        dailySummary: toCamelKeys(summaryData),
    };
}

// ─── Get active session ───────────────────────────────────────────────────────

export async function getActiveSession(
    supabase: SupabaseClient,
    { tenantId, storeId }: { tenantId: string; storeId: string },
) {
    const { data, error } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .maybeSingle();

    if (error) throw error;
    return data ? toCamelKeys(data) : null;
}

// ─── Transfer session ─────────────────────────────────────────────────────────

export interface TransferSessionParams {
    tenantId: string;
    storeId: string;
    userId: string;
    claimCode: string;
}

export async function transferSession(supabase: SupabaseClient, params: TransferSessionParams) {
    const { tenantId, storeId, userId, claimCode } = params;

    const { data: activeSession, error: fetchError } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

    if (fetchError || !activeSession)
        throw Object.assign(new Error("No active session found"), { status: 404 });

    const session = activeSession as { id: string; claim_code: string; daily_summary_id: string };
    if (session.claim_code !== claimCode.toUpperCase())
        throw Object.assign(new Error("Invalid claim code"), { status: 403 });

    const { error: endError } = await supabase
        .from("store_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("id", session.id)
        .eq("tenant_id", tenantId);

    if (endError) throw endError;

    const { data: newSession, error: newError } = await supabase
        .from("store_sessions")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            daily_summary_id: session.daily_summary_id,
            user_id: userId,
            claim_code: generateClaimCode(),
            previous_session_id: session.id,
        })
        .select()
        .single();

    if (newError || !newSession) throw new Error(newError?.message ?? "Failed to create new session");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("session_transferred", {
        refId: (newSession as { id: string }).id,
        refTable: "store_sessions",
        metadata: { previous_session_id: session.id, daily_summary_id: session.daily_summary_id },
    });

    return toCamelKeys(newSession);
}

// ─── End session ──────────────────────────────────────────────────────────────

export async function endSession(
    supabase: SupabaseClient,
    { tenantId, sessionId, userId }: { tenantId: string; sessionId: string; userId: string },
) {
    const { data, error } = await supabase
        .from("store_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Session not found"), { status: 404 });

    const raw = data as { store_id: string };
    const log = createLogger(supabase, { tenantId, userId, storeId: raw.store_id });
    log("session_ended", { refId: sessionId, refTable: "store_sessions" });

    return toCamelKeys(data);
}
