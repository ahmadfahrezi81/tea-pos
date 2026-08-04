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

    const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", storeIds)
        .order("name");

    if (storesError) throw storesError;

    const assignmentsByStore: Record<string, Array<{ user_id: string; is_default: boolean }>> = {};
    (assignments ?? []).forEach((a) => {
        if (!assignmentsByStore[a.store_id]) assignmentsByStore[a.store_id] = [];
        assignmentsByStore[a.store_id].push({ user_id: a.user_id, is_default: a.is_default });
    });

    return {
        stores: toCamelKeys(stores ?? []),
        assignments: toCamelKeys(assignmentsByStore),
    };
}
