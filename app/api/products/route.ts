// app/api/products/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateProductInput,
    UpdateProductInput,
    ListProductsQuery,
    ProductListResponse,
    CreateProductResponse,
    UpdateProductResponse,
    DeleteProductResponse,
} from "@/lib/shared/schemas/products";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// GET /api/products
// ============================================================================
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
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 },
            );
        }

        const { all, categoryId, status } = queryResult.data;

        // JOIN with product_categories to get category name
        let query = supabase
            .from("products")
            .select(
                `
                *,
                product_categories (
                    id,
                    name
                )
            `,
            )
            .eq("tenant_id", currentTenantId)
            .order("name");

        // Filter by status if provided
        if (status) {
            query = query.eq("status", status);
        }
        // Otherwise use legacy is_active if not showing all
        else if (!all) {
            query = query.eq("is_active", true);
        }

        // Filter by category if provided
        if (categoryId) {
            query = query.eq("category_id", categoryId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("Products query error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Transform the data to flatten category name
        const transformedData = (data || []).map((product) => {
            const { product_categories, ...rest } = product;
            return {
                ...rest,
                category_name: product_categories?.name || null,
            };
        });

        const camelData = toCamelKeys(transformedData);

        const parsed = ProductListResponse.safeParse({ products: camelData });
        if (!parsed.success) {
            console.error("Products response validation failed:", parsed.error);
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        // return NextResponse.json(parsed.data);

        return NextResponse.json(parsed.data, {
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("Products GET error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/products
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateProductInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { name, price, imageUrl, categoryId, status, isMain } =
            result.data;

        // Check if user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // Build product payload with new and legacy fields
        const productPayload = toSnakeKeys({
            name,
            price,
            imageUrl: imageUrl || null,
            imagePath: result.data.imagePath || null,
            categoryId: categoryId || null,
            status: status || "active", // Default to active
            isMain: isMain !== undefined ? isMain : false,
            isActive: true, // Set legacy field for backward compatibility
            tenantId: currentTenantId,
        });

        const { data: productData, error: productError } = await supabase
            .from("products")
            .insert(productPayload)
            .select(
                `
                *,
                product_categories (
                    id,
                    name
                )
            `,
            )
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product insert failed" },
                { status: 400 },
            );
        }

        // Transform the data to flatten category name
        const { product_categories, ...rest } = productData;
        const transformedProduct = {
            ...rest,
            category_name: product_categories?.name || null,
        };

        const camelProduct = toCamelKeys(transformedProduct);
        const response = { success: true, product: camelProduct };
        const parsed = CreateProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error("Products POST error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// PUT /api/products
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = UpdateProductInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const {
            id,
            name,
            price,
            imageUrl,
            categoryId,
            status,
            isActive,
            isMain,
        } = result.data;

        // Check if user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // If new image is uploaded, delete old image from storage
        if (result.data.imagePath) {
            // Fetch old image path
            const { data: oldProduct } = await supabase
                .from("products")
                .select("image_path")
                .eq("id", id)
                .eq("tenant_id", currentTenantId)
                .single();

            if (oldProduct?.image_path) {
                // Delete old image from storage
                await supabase.storage
                    .from("product-images")
                    .remove([oldProduct.image_path]);
            }
        }

        // Build update payload (only include provided fields)
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (price !== undefined) updates.price = price;
        if (imageUrl !== undefined) updates.image_url = imageUrl;
        if (result.data.imagePath !== undefined)
            updates.image_path = result.data.imagePath;
        if (categoryId !== undefined) updates.category_id = categoryId;
        if (status !== undefined) {
            updates.status = status;
            // Sync legacy field for backward compatibility
            updates.is_active = status === "active";
        }
        if (isActive !== undefined) {
            updates.is_active = isActive;
            // Sync new field for forward compatibility
            updates.status = isActive ? "active" : "inactive";
        }
        if (isMain !== undefined) updates.is_main = isMain;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length === 1) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 },
            );
        }

        const { data: productData, error: productError } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select(
                `
                *,
                product_categories (
                    id,
                    name
                )
            `,
            )
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product not found" },
                { status: 404 },
            );
        }

        // Transform the data to flatten category name
        const { product_categories, ...rest } = productData;
        const transformedProduct = {
            ...rest,
            category_name: product_categories?.name || null,
        };

        const camelProduct = toCamelKeys(transformedProduct);
        const response = { success: true, product: camelProduct };
        const parsed = UpdateProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Products PUT error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// DELETE /api/products
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Product ID is required" },
                { status: 400 },
            );
        }

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { data: productData, error: productError } = await supabase
            .from("products")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select(
                `
                *,
                product_categories (
                    id,
                    name
                )
            `,
            )
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product not found" },
                { status: 404 },
            );
        }

        // Transform the data to flatten category name
        const { product_categories, ...rest } = productData;
        const transformedProduct = {
            ...rest,
            category_name: product_categories?.name || null,
        };

        const camelProduct = toCamelKeys(transformedProduct);
        const response = { success: true, product: camelProduct };
        const parsed = DeleteProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error("Products DELETE error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
