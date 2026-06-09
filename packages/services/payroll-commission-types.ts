import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function listPayrollCommissionTypes(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_commission_types")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function createPayrollCommissionType(
    supabase: SupabaseClient,
    { tenantId, name, slug }: { tenantId: string; name: string; slug: string },
) {
    const { data, error } = await supabase
        .from("payroll_commission_types")
        .insert({ tenant_id: tenantId, name, slug })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create commission type");
    return toCamelKeys(data);
}

export async function updatePayrollCommissionType(
    supabase: SupabaseClient,
    { id, tenantId, name, isEnabled }: { id: string; tenantId: string; name?: string; isEnabled?: boolean },
) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (isEnabled !== undefined) updates.is_enabled = isEnabled;

    const { data, error } = await supabase
        .from("payroll_commission_types")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Commission type not found"), { status: 404 });
    return toCamelKeys(data);
}
