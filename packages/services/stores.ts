import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listUserStores(supabase: SupabaseClient, { tenantId, userId }: { tenantId: string; userId: string }) {
    const { data: assignments, error: assignmentsError } = await supabase
        .from("user_store_assignments")
        .select("user_id, store_id, is_default")
        .eq("user_id", userId);

    if (assignmentsError) throw assignmentsError;

    const storeIds = (assignments ?? []).map((a) => a.store_id);

    const [{ data: stores, error: storesError }, { data: tenantUsers, error: usersError }] = await Promise.all([
        supabase.from("stores").select("*").eq("tenant_id", tenantId).in("id", storeIds).order("name"),
        supabase
            .from("user_tenant_assignments")
            .select("users(id, full_name, email)")
            .eq("tenant_id", tenantId),
    ]);

    if (storesError) throw storesError;
    if (usersError) throw usersError;

    type UserRow = { id: string; full_name: string; email: string };
    const users = (tenantUsers ?? [])
        .map((r) => r.users as unknown as UserRow | null)
        .filter((u): u is UserRow => u !== null)
        .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const assignmentsByStore: Record<string, Array<{ user_id: string; is_default: boolean }>> = {};
    (assignments ?? []).forEach((a) => {
        if (!assignmentsByStore[a.store_id]) assignmentsByStore[a.store_id] = [];
        assignmentsByStore[a.store_id].push({ user_id: a.user_id, is_default: a.is_default });
    });

    return {
        stores: toCamelKeys(stores ?? []),
        users: toCamelKeys(users),
        assignments: toCamelKeys(assignmentsByStore),
    };
}
