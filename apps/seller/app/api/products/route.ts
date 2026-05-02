import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListProductsQuery,
    ProductListResponse,
} from "@tea-pos/features/products/schema";
import { toCamelKeys } from "@tea-pos/utils/schemas";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListProductsQuery.safeParse(
            Object.fromEntries(searchParams),
        );
        if (!queryResult.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: queryResult.error.format() },
                { status: 400 },
            );
        }

        const { all, categoryId, status } = queryResult.data;

        let query = supabase
            .from("products")
            .select(`*, product_categories(id, name)`)
            .eq("tenant_id", currentTenantId)
            .order("name");

        if (status) {
            query = query.eq("status", status);
        } else if (!all) {
            query = query.eq("is_active", true);
        }

        if (categoryId) {
            query = query.eq("category_id", categoryId);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const transformedData = (data || []).map((product) => {
            const { product_categories, ...rest } = product;
            return { ...rest, category_name: product_categories?.name || null };
        });

        const camelData = toCamelKeys(transformedData);
        const parsed = ProductListResponse.safeParse({ products: camelData });
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid response shape", details: parsed.error.format() },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Products GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
