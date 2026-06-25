import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function listPayrollClaimTypes(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_claim_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function createPayrollClaimType(
    supabase: SupabaseClient,
    {
        tenantId,
        name,
        slug,
        frequency,
        amount = 0,
        claimSource = "manual",
        autoThresholdHours,
    }: {
        tenantId: string;
        name: string;
        slug: string;
        frequency: string;
        amount?: number;
        claimSource?: string;
        autoThresholdHours?: number;
    },
) {
    const { data, error } = await supabase
        .from("payroll_claim_configs")
        .insert({
            tenant_id: tenantId,
            name,
            slug,
            frequency,
            amount,
            claim_source: claimSource,
            auto_threshold_hours: autoThresholdHours ?? null,
        })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create claim type");
    return toCamelKeys(data);
}

export async function updatePayrollClaimType(
    supabase: SupabaseClient,
    {
        id,
        tenantId,
        name,
        isEnabled,
        amount,
        claimSource,
        autoThresholdHours,
    }: {
        id: string;
        tenantId: string;
        name?: string;
        isEnabled?: boolean;
        amount?: number;
        claimSource?: string;
        autoThresholdHours?: number;
    },
) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (isEnabled !== undefined) updates.is_enabled = isEnabled;
    if (amount !== undefined) updates.amount = amount;
    if (claimSource !== undefined) updates.claim_source = claimSource;
    if (autoThresholdHours !== undefined) updates.auto_threshold_hours = autoThresholdHours;

    const { data, error } = await supabase
        .from("payroll_claim_configs")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Claim type not found"), { status: 404 });
    return toCamelKeys(data);
}

export async function listUserClaimEligibility(
    supabase: SupabaseClient,
    { tenantId, userId }: { tenantId: string; userId: string },
) {
    const { data, error } = await supabase
        .from("payroll_user_claim_assignments")
        .select("*, payroll_claim_configs(id, name, slug, frequency, is_enabled)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function setUserClaimEligibility(
    supabase: SupabaseClient,
    { tenantId, userId, claimConfigIds }: { tenantId: string; userId: string; claimConfigIds: string[] },
) {
    const { data: allRows } = await supabase
        .from("payroll_user_claim_assignments")
        .select("id, claim_config_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    type Row = { id: string; claim_config_id: string };
    const all = (allRows ?? []) as Row[];

    // Revoke = delete. Re-add = plain insert. No reactivate path — eligibility
    // rows carry no history worth preserving (unlike claims, which snapshot
    // their own data at submission time).
    const toRevoke = all.filter((r) => !claimConfigIds.includes(r.claim_config_id));
    if (toRevoke.length > 0) {
        await supabase
            .from("payroll_user_claim_assignments")
            .delete()
            .in("id", toRevoke.map((r) => r.id));
    }

    const existingConfigIds = all.map((r) => r.claim_config_id);
    const toAdd = claimConfigIds.filter((id) => !existingConfigIds.includes(id));
    if (toAdd.length > 0) {
        await supabase
            .from("payroll_user_claim_assignments")
            .insert(toAdd.map((claim_config_id) => ({ tenant_id: tenantId, user_id: userId, claim_config_id })));
    }
}
