import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function getPayrollUserInfo(
    supabase: SupabaseClient,
    { tenantId, userId }: { tenantId: string; userId: string },
) {
    const { data } = await supabase
        .from("payroll_user_info")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

    return data ? (toCamelKeys(data) as Record<string, unknown>) : null;
}

export async function upsertPayrollUserInfo(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        commissionTypeId,
        ratePerCup,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
    }: {
        tenantId: string;
        userId: string;
        commissionTypeId?: string | null;
        ratePerCup?: number;
        bankName?: string | null;
        bankAccountNumber?: string | null;
        bankAccountHolder?: string | null;
    },
) {
    const { data: existing } = await supabase
        .from("payroll_user_info")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

    const row = existing as {
        rate_per_cup: number;
        commission_type_id: string | null;
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
    } | null;

    const merged = {
        tenant_id: tenantId,
        user_id: userId,
        rate_per_cup: ratePerCup !== undefined ? ratePerCup : (row?.rate_per_cup ?? 0),
        commission_type_id: commissionTypeId !== undefined ? commissionTypeId : (row?.commission_type_id ?? null),
        bank_name: bankName !== undefined ? bankName : (row?.bank_name ?? null),
        bank_account_number: bankAccountNumber !== undefined ? bankAccountNumber : (row?.bank_account_number ?? null),
        bank_account_holder: bankAccountHolder !== undefined ? bankAccountHolder : (row?.bank_account_holder ?? null),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("payroll_user_info")
        .upsert(merged, { onConflict: "tenant_id,user_id" })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to upsert payroll user info");
    return toCamelKeys(data);
}
