import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

// ─── Get effective rate ───────────────────────────────────────────────────────
// User-specific rate takes priority. Falls back to tenant default (user_id IS NULL).
// Returns rate = 0 if no config exists at all.

export async function getCommissionRate(
    supabase: SupabaseClient,
    { tenantId, userId }: { tenantId: string; userId: string },
) {
    const today = new Date().toISOString().split("T")[0];

    const { data: userRate } = await supabase
        .from("commission_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .lte("effective_date", today)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (userRate) {
        const r = userRate as { rate_per_cup: number };
        return { rate: r.rate_per_cup, config: toCamelKeys(userRate) };
    }

    const { data: tenantRate } = await supabase
        .from("commission_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("user_id", null)
        .lte("effective_date", today)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (tenantRate) {
        const r = tenantRate as { rate_per_cup: number };
        return { rate: r.rate_per_cup, config: toCamelKeys(tenantRate) };
    }

    return { rate: 0, config: null };
}

// ─── Upsert config ────────────────────────────────────────────────────────────

export interface UpsertCommissionConfigParams {
    tenantId: string;
    actorId: string;
    userId?: string | null;
    ratePerCup: number;
    effectiveDate: string;
}

export async function upsertCommissionConfig(
    supabase: SupabaseClient,
    params: UpsertCommissionConfigParams,
) {
    const { tenantId, actorId, userId, ratePerCup, effectiveDate } = params;

    // Manual upsert — partial unique indexes don't work reliably with PostgREST onConflict
    let query = supabase
        .from("commission_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("effective_date", effectiveDate);

    if (userId) {
        query = query.eq("user_id", userId);
    } else {
        query = query.is("user_id", null);
    }

    const { data: existing } = await query.maybeSingle();

    let result: unknown;

    if (existing) {
        const { data, error } = await supabase
            .from("commission_configs")
            .update({ rate_per_cup: ratePerCup })
            .eq("id", (existing as { id: string }).id)
            .select()
            .single();

        if (error || !data) throw new Error(error?.message ?? "Failed to update commission config");
        result = data;
    } else {
        const { data, error } = await supabase
            .from("commission_configs")
            .insert({
                tenant_id: tenantId,
                user_id: userId ?? null,
                rate_per_cup: ratePerCup,
                effective_date: effectiveDate,
            })
            .select()
            .single();

        if (error || !data) throw new Error(error?.message ?? "Failed to create commission config");
        result = data;
    }

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("commission_config_updated", {
        refId: (result as { id: string }).id,
        refTable: "commission_configs",
        metadata: { target_user_id: userId ?? null, rate_per_cup: ratePerCup, effective_date: effectiveDate },
    });

    return toCamelKeys(result);
}
