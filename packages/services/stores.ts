import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Aliased to camelCase in the query rather than walked afterwards, so rows come
 * back already in the response's shape and there is nothing for `toCamelKeys`
 * to do.
 *
 * This list must stay in step with `StoreResponse`: dropping a column here
 * fails the parse rather than shrinking the payload, because the schema's
 * fields are `.nullable()`, not `.optional()`.
 */
const STORE_COLUMNS = `
    id, name, address, latitude, longitude, status,
    tenantId:tenant_id,
    openTime:open_time,
    closeTime:close_time,
    createdAt:created_at,
    updatedAt:updated_at
`;

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listUserStores(supabase: SupabaseClient, { tenantId, userId }: { tenantId: string; userId: string }) {
    // Aliased here too: this map is assembled in JS, so it never passed through
    // a key-conversion step of its own — the camelCase came from `toCamelKeys`
    // running over the whole return value.
    const { data: assignments, error: assignmentsError } = await supabase
        .from("user_store_assignments")
        .select("userId:user_id, storeId:store_id, isDefault:is_default")
        .eq("user_id", userId);

    if (assignmentsError) throw assignmentsError;

    const rows = assignments ?? [];
    const storeIds = rows.map((a) => a.storeId);

    const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select(STORE_COLUMNS)
        .eq("tenant_id", tenantId)
        .in("id", storeIds)
        .order("name");

    if (storesError) throw storesError;

    const assignmentsByStore: Record<string, Array<{ userId: string; isDefault: boolean }>> = {};
    rows.forEach((a) => {
        if (!assignmentsByStore[a.storeId]) assignmentsByStore[a.storeId] = [];
        assignmentsByStore[a.storeId].push({ userId: a.userId, isDefault: a.isDefault });
    });

    return {
        stores: stores ?? [],
        assignments: assignmentsByStore,
    };
}

/**
 * Every store in the tenant, regardless of who is asking or what state it is in.
 *
 * The backoffice sibling of `listUserStores`: an admin filtering a tenant-wide
 * screen is not limited to the shops they are rostered at. Demo and retired
 * stores come back too — the picker hides them behind a toggle rather than
 * pretending they do not exist, which is the only way to look at one.
 */
export async function listTenantStores(
    supabase: SupabaseClient,
    { tenantId }: { tenantId: string },
) {
    const { data, error } = await supabase
        .from("stores")
        .select(STORE_COLUMNS)
        .eq("tenant_id", tenantId)
        .order("name");

    if (error) throw error;

    return { stores: data ?? [] };
}
