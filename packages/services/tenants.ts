import type { SupabaseClient } from "@supabase/supabase-js";
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
