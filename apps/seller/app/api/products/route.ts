import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListProductsQuery, ProductListResponse } from "@tea-pos/features/products/schema";
import { listProducts } from "@tea-pos/services/products";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListProductsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listProducts(supabase, { tenantId, ...query.data });
        const parsed = ProductListResponse.safeParse({ products: data });
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/products", error);
    }
}
