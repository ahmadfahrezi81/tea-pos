import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function listPayrollUserInfos(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_user_info")
        .select("*")
        .eq("tenant_id", tenantId);

    if (error) throw error;
    return (data ?? []).map((row) => toCamelKeys(row) as Record<string, unknown>);
}

export async function getPayrollUserInfo(
    supabase: SupabaseClient,
    { tenantId, userId }: { tenantId: string; userId: string },
) {
    const { data } = await supabase
        .from("payroll_user_info")
        .select("*, payroll_commission_types(name, rate_per_cup)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return null;

    const { payroll_commission_types: commissionType, ...row } = data as Record<string, unknown> & {
        payroll_commission_types: { name: string; rate_per_cup: number } | null;
    };

    return {
        ...(toCamelKeys(row) as Record<string, unknown>),
        commissionTypeName: commissionType?.name ?? null,
        ratePerCup: commissionType?.rate_per_cup ?? null,
    } as Record<string, unknown>;
}

export async function upsertPayrollUserInfo(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        commissionTypeId,
        bankName,
        bankAccountNumber,
        bankAccountHolder,
    }: {
        tenantId: string;
        userId: string;
        commissionTypeId?: string | null;
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
        commission_type_id: string | null;
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
    } | null;

    const merged = {
        tenant_id: tenantId,
        user_id: userId,
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
