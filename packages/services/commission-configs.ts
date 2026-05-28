import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

// ─── Get effective rate ───────────────────────────────────────────────────────
// Returns the most recent config for the given tenant + role where effective_date <= today.
// Returns rate = 0 if no config exists.

export async function getCommissionRate(
    supabase: SupabaseClient,
    { tenantId, role }: { tenantId: string; role: string },
) {
    const today = new Date().toISOString().split("T")[0];

    const { data } = await supabase
        .from("tenant_commission_configs")
        .select("rate_per_cup, effective_date")
        .eq("tenant_id", tenantId)
        .eq("role", role)
        .lte("effective_date", today)
        .order("effective_date", { ascending: false })
        .limit(1)
        .maybeSingle();

    return {
        rate: data?.rate_per_cup ?? 0,
        effectiveDate: data?.effective_date ?? today,
    };
}

// ─── Upsert config ────────────────────────────────────────────────────────────

export interface UpsertCommissionConfigParams {
    tenantId: string;
    actorId: string;
    role: string;
    ratePerCup: number;
    effectiveDate: string;
}

export async function upsertCommissionConfig(
    supabase: SupabaseClient,
    params: UpsertCommissionConfigParams,
) {
    const { tenantId, actorId, role, ratePerCup, effectiveDate } = params;

    const { data: existing } = await supabase
        .from("tenant_commission_configs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("role", role)
        .eq("effective_date", effectiveDate)
        .maybeSingle();

    let result: unknown;

    if (existing) {
        const { data, error } = await supabase
            .from("tenant_commission_configs")
            .update({ rate_per_cup: ratePerCup })
            .eq("id", (existing as { id: string }).id)
            .select()
            .single();

        if (error || !data) throw new Error(error?.message ?? "Failed to update commission config");
        result = data;
    } else {
        const { data, error } = await supabase
            .from("tenant_commission_configs")
            .insert({
                tenant_id: tenantId,
                role,
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
        refTable: "tenant_commission_configs",
        metadata: { role, rate_per_cup: ratePerCup, effective_date: effectiveDate },
    });

    return toCamelKeys(result);
}
