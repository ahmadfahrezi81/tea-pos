import { unstable_cache } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListProductsQuery, ProductListResponse } from "@tea-pos/features/products/schema";
import { listProducts, type ListProductsParams } from "@tea-pos/services/products";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

/**
 * Six hours. The menu has changed roughly twice a year, and nothing in either
 * app writes `tenant_products` — there is no POST/PUT/PATCH route for products
 * anywhere, so edits happen directly in the Supabase dashboard and no
 * application code runs to invalidate anything.
 *
 * That rules out `revalidateTag` as the primary mechanism, and it makes a purge
 * endpoint pointless rather than missing: one editor, changes outside trading
 * hours, and any TTL that clears overnight means an evening price change is live
 * before the morning's first order.
 *
 * `useProducts` holds its own 5-minute SWR window on top of this, so the real
 * worst case is TTL + 5 minutes for an app left open across the boundary.
 *
 * **If products ever gain an edit UI, call `revalidateTag` from it.** The TTL is
 * correct *because* editing is out-of-band; the day that changes, so does this.
 */
const CACHE_SECONDS = 21_600;

/**
 * Built per tenant so `tenantId` is part of `keyParts` explicitly.
 *
 * The arguments are folded into the cache key too, which is what separates
 * `all` / `categoryId` / `status` variants — but tenant isolation is a security
 * property and should not rest on that behaviour. Hence the redundancy.
 *
 * The Supabase client is constructed *inside* the cached function rather than
 * passed in: `unstable_cache` serializes its arguments into the key, and a
 * client object has no business being part of one. `getServiceClient()` is a
 * module-scope singleton, so this costs nothing.
 */
function cachedListProducts(tenantId: string) {
    return unstable_cache(
        (params: ListProductsParams) => listProducts(getServiceClient(), params),
        ["products", tenantId],
        { revalidate: CACHE_SECONDS, tags: [`products-${tenantId}`] },
    );
}

export async function GET(request: NextRequest) {
    try {
        const tenantId = await getCurrentTenantId();
        const query = ListProductsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await cachedListProducts(tenantId)({ tenantId, ...query.data });
        const parsed = ProductListResponse.safeParse({ products: data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/products", error);
    }
}
