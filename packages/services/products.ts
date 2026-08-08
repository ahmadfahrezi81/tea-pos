import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListProductsParams {
    tenantId: string;
    all?: boolean;
    categoryId?: string;
    status?: string;
}

/**
 * Aliased to camelCase in the query rather than walked afterwards, so rows come
 * back already in the response's shape and there is nothing for `toCamelKeys`
 * to do.
 *
 * This list must stay in step with `ProductResponse`: its fields are
 * `.nullable()`, not `.optional()`, so a column dropped here fails the parse
 * rather than shrinking the payload.
 */
const PRODUCT_COLUMNS = `
    id, name, price, status,
    imageUrl:image_url,
    imagePath:image_path,
    categoryId:category_id,
    isActive:is_active,
    popularityRank:popularity_rank,
    tenantId:tenant_id,
    createdAt:created_at,
    updatedAt:updated_at
`;

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listProducts(supabase: SupabaseClient, params: ListProductsParams) {
    const { tenantId, all, categoryId, status } = params;

    let query = supabase
        .from("tenant_products")
        .select(PRODUCT_COLUMNS)
        .eq("tenant_id", tenantId)
        .order("popularity_rank", { ascending: true, nullsFirst: false })
        .order("price", { ascending: true });

    if (status) {
        query = query.eq("status", status);
    } else if (!all) {
        query = query.eq("is_active", true);
    }

    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
}
