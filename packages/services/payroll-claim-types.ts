import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function listPayrollClaimTypes(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_claim_types")
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
        .from("payroll_claim_types")
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
        .from("payroll_claim_types")
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
        .from("payroll_claim_eligibility")
        .select("*, payroll_claim_types(id, name, slug, frequency, is_enabled)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function setUserClaimEligibility(
    supabase: SupabaseClient,
    { tenantId, userId, claimTypeIds }: { tenantId: string; userId: string; claimTypeIds: string[] },
) {
    const { data: allRows } = await supabase
        .from("payroll_claim_eligibility")
        .select("id, claim_type_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    type Row = { id: string; claim_type_id: string };
    const all = (allRows ?? []) as Row[];

    // Revoke = delete. Re-add = plain insert. No reactivate path — eligibility
    // rows carry no history worth preserving (unlike claims, which snapshot
    // their own data at submission time).
    const toRevoke = all.filter((r) => !claimTypeIds.includes(r.claim_type_id));
    if (toRevoke.length > 0) {
        await supabase
            .from("payroll_claim_eligibility")
            .delete()
            .in("id", toRevoke.map((r) => r.id));
    }

    const existingTypeIds = all.map((r) => r.claim_type_id);
    const toAdd = claimTypeIds.filter((id) => !existingTypeIds.includes(id));
    if (toAdd.length > 0) {
        await supabase
            .from("payroll_claim_eligibility")
            .insert(toAdd.map((claim_type_id) => ({ tenant_id: tenantId, user_id: userId, claim_type_id })));
    }
}
