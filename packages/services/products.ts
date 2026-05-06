import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListProductsParams {
    tenantId: string;
    all?: boolean;
    categoryId?: string;
    status?: string;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listProducts(supabase: SupabaseClient, params: ListProductsParams) {
    const { tenantId, all, categoryId, status } = params;

    let query = supabase
        .from("products")
        .select(`*, product_categories(id, name)`)
        .eq("tenant_id", tenantId)
        .order("name");

    if (status) {
        query = query.eq("status", status);
    } else if (!all) {
        query = query.eq("is_active", true);
    }

    if (categoryId) query = query.eq("category_id", categoryId);

    const { data, error } = await query;
    if (error) throw error;

    const transformed = (data ?? []).map((product) => {
        const { product_categories, ...rest } = product;
        return { ...rest, category_name: product_categories?.name ?? null };
    });

    return toCamelKeys(transformed);
}
