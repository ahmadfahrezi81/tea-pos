import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function listPayrollCommissionTypes(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_commission_configs")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function createPayrollCommissionType(
    supabase: SupabaseClient,
    { tenantId, name, slug, ratePerCup }: { tenantId: string; name: string; slug: string; ratePerCup: number },
) {
    const { data, error } = await supabase
        .from("payroll_commission_configs")
        .insert({ tenant_id: tenantId, name, slug, rate_per_cup: ratePerCup })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create commission type");
    return toCamelKeys(data);
}

export async function updatePayrollCommissionType(
    supabase: SupabaseClient,
    { id, tenantId, name, isEnabled, ratePerCup }: { id: string; tenantId: string; name?: string; isEnabled?: boolean; ratePerCup?: number },
) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (isEnabled !== undefined) updates.is_enabled = isEnabled;
    if (ratePerCup !== undefined) updates.rate_per_cup = ratePerCup;

    const { data, error } = await supabase
        .from("payroll_commission_configs")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Commission type not found"), { status: 404 });
    return toCamelKeys(data);
}
