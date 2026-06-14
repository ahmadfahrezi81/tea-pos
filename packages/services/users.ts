import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

// ─── Public functions ─────────────────────────────────────────────────────────

export async function getUser(supabase: SupabaseClient, { userId }: { userId: string }) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        const status = error.code === "PGRST116" ? 404 : 500;
        const message = error.code === "PGRST116" ? "User not found" : "Failed to fetch user";
        throw Object.assign(new Error(message), { status });
    }

    if (!data) throw Object.assign(new Error("User not found"), { status: 404 });

    return toCamelKeys(data);
}

export async function listTenantUsers(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("user_tenant_assignments")
        .select("users(*)")
        .eq("tenant_id", tenantId);

    if (error) throw error;

    type Row = { users: unknown };
    const users = toCamelKeys(
        ((data as Row[]).map((r) => r.users).filter(Boolean) as Record<string, unknown>[])
    ) as Array<Record<string, unknown>>;

    const avatarUrls = await Promise.all(
        users.map(async (u) => {
            try {
                const { data: authUser } = await supabase.auth.admin.getUserById(u["id"] as string);
                return (authUser?.user?.user_metadata?.["avatar_url"] as string | undefined) ?? null;
            } catch {
                return null;
            }
        }),
    );

    return users.map((u, i) => ({ ...u, avatarUrl: avatarUrls[i] }));
}

export async function updateUserLanguage(
    supabase: SupabaseClient,
    { userId, language }: { userId: string; language: "en" | "id" },
) {
    const { error } = await supabase
        .from("users")
        .update({ preferred_language: language })
        .eq("id", userId);

    if (error) throw Object.assign(new Error(error.message), { status: 500 });
}

export interface UpdateUserParams {
    userId: string;
    fullName?: string;
    phoneNumber?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankAccountHolder?: string | null;
}

export async function updateUser(
    supabase: SupabaseClient,
    { userId, fullName, phoneNumber, bankName, bankAccountNumber, bankAccountHolder }: UpdateUserParams,
) {
    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (bankName !== undefined) updates.bank_name = bankName;
    if (bankAccountNumber !== undefined) updates.bank_account_number = bankAccountNumber;
    if (bankAccountHolder !== undefined) updates.bank_account_holder = bankAccountHolder;

    if (Object.keys(updates).length === 0) return getUser(supabase, { userId });

    const { data, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", userId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "User not found"), { status: 404 });

    return toCamelKeys(data);
}
