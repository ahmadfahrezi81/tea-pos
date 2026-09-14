import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@tea-pos/utils/errors";

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
 * Remember which store this user's app opens on — see task 064.
 *
 * `is_default` means *the store this user opens on*, and the picker is what
 * writes it. It is not an admin's roster decision: the only code that ever
 * wrote it with that meaning lives in the archived `apps/admin`, and the two
 * live readers of this table (`createOrder` here in `orders.ts`, and the QRIS
 * route) both `select("id")` as a pure access check and never look at the
 * column.
 *
 * **Scoped to the tenant, through `stores`.** The rows carry `user_id`,
 * `store_id` and no `tenant_id`, so "one default per user" is only the right
 * rule inside one tenant — a user assigned across two of them wants one default
 * in each. No user is today, and the join costs nothing, so the scope is here
 * rather than in a comment promising to add it later.
 *
 * **Two statements, not one.** Between them the user briefly has no default at
 * all. A second device booting inside that window falls through to the first
 * assigned store, shows something valid, and corrects itself on the next load —
 * one device, one boot, nothing written. The single-statement version needs
 * `set is_default = (store_id = $1)`, which is an expression supabase-js cannot
 * send, so it would mean an RPC and a migration. `transfer_store_session` is
 * the precedent if that ever becomes worth it.
 *
 * Idempotent: picking the store that is already default writes nothing.
 */
export async function setDefaultStore(
    supabase: SupabaseClient,
    { tenantId, userId, storeId }: { tenantId: string; userId: string; storeId: string },
) {
    /* One read does both jobs: it proves the caller may have this store — the
       inner join means a store in another tenant simply does not come back —
       and it names the rows to clear. Never trust the store id in the body. */
    const { data: rows, error } = await supabase
        .from("user_store_assignments")
        .select("id, storeId:store_id, isDefault:is_default, stores!inner(tenant_id)")
        .eq("user_id", userId)
        .eq("stores.tenant_id", tenantId);

    if (error) throw error;

    const assignments = rows ?? [];
    const target = assignments.find((row) => row.storeId === storeId);
    if (!target) throw new ApiError("Not assigned to this store", 403);

    const stale = assignments
        .filter((row) => row.isDefault && row.id !== target.id)
        .map((row) => row.id);

    if (stale.length > 0) {
        const { error: clearError } = await supabase
            .from("user_store_assignments")
            .update({ is_default: false })
            .in("id", stale);
        if (clearError) throw clearError;
    }

    if (!target.isDefault) {
        const { error: setError } = await supabase
            .from("user_store_assignments")
            .update({ is_default: true })
            .eq("id", target.id);
        if (setError) throw setError;
    }
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
