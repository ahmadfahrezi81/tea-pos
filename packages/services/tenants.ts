import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { isPayFrequency, type PayFrequency } from "@tea-pos/utils/week";

/* The pay cadence is a property of the tenant: every staff member is paid on the
   same schedule, and a payout window has to mean the same thing for all of them.
   Read it here rather than passing it around, and never default it — a guessed
   cadence writes payouts against a window that was never real. */
export async function getTenantPayFrequency(
    supabase: SupabaseClient,
    tenantId: string,
): Promise<PayFrequency> {
    const { data, error } = await supabase
        .from("tenants")
        .select("pay_frequency")
        .eq("id", tenantId)
        .single();

    if (error) throw error;

    const frequency = (data as { pay_frequency: string } | null)?.pay_frequency;
    if (!isPayFrequency(frequency)) {
        throw new Error(`Tenant ${tenantId} has an unsupported pay frequency: ${frequency}`);
    }

    return frequency;
}

/* Changing this reshapes which window every future payout is written into, so
   it is only ever safe on a day where the current period ends: run it after the
   last close of a period and before the next one opens. The screen says so; the
   service does not enforce it, because "which day is safe" is a property of the
   pay calendar this app does not store yet. */
export async function setTenantPayFrequency(
    supabase: SupabaseClient,
    tenantId: string,
    frequency: PayFrequency,
) {
    const { data, error } = await supabase
        .from("tenants")
        .update({ pay_frequency: frequency })
        .eq("id", tenantId)
        .select("id, pay_frequency")
        .single();

    if (error) throw error;
    return toCamelKeys(data);
}
