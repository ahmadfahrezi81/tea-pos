// app/api/categories/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateCategoryInput,
    UpdateCategoryInput,
    CategoryListResponse,
    CreateCategoryResponse,
    UpdateCategoryResponse,
    DeleteCategoryResponse,
} from "@/lib/shared/schemas/product-categories";
import { toCamelKeys, toSnakeKeys } from "@/lib/shared/utils/schemas";

// ============================================================================
// GET /api/categories
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();

        const { data, error } = await supabase
            .from("product_categories")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .order("name");

        if (error) {
            console.error("Categories query error:", error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const camelData = toCamelKeys(data || []);

        const parsed = CategoryListResponse.safeParse({
            categories: camelData,
        });
        if (!parsed.success) {
            console.error(
                "Categories response validation failed:",
                parsed.error,
            );
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
        console.error("Categories GET error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// POST /api/categories
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateCategoryInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { name, slug } = result.data;

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

        const categoryPayload = toSnakeKeys({
            name,
            slug,
            tenantId: currentTenantId,
        });

        const { data: categoryData, error: categoryError } = await supabase
            .from("product_categories")
            .insert(categoryPayload)
            .select()
            .single();

        if (categoryError || !categoryData) {
            return NextResponse.json(
                {
                    error: categoryError?.message || "Category insert failed",
                },
                { status: 400 },
            );
        }

        const camelCategory = toCamelKeys(categoryData);
        const response = { success: true, category: camelCategory };
        const parsed = CreateCategoryResponse.safeParse(response);
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
        console.error("Categories POST error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// PUT /api/categories
// ============================================================================
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = UpdateCategoryInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { id, name, slug } = result.data;

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

        // Build update payload (only include provided fields)
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (slug !== undefined) updates.slug = slug;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length === 1) {
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 },
            );
        }

        const { data: categoryData, error: categoryError } = await supabase
            .from("product_categories")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (categoryError || !categoryData) {
            return NextResponse.json(
                { error: categoryError?.message || "Category not found" },
                { status: 404 },
            );
        }

        const camelCategory = toCamelKeys(categoryData);
        const response = { success: true, category: camelCategory };
        const parsed = UpdateCategoryResponse.safeParse(response);
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
        console.error("Categories PUT error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ============================================================================
// DELETE /api/categories
// ============================================================================
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Category ID is required" },
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

        const { data: categoryData, error: categoryError } = await supabase
            .from("product_categories")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (categoryError || !categoryData) {
            return NextResponse.json(
                { error: categoryError?.message || "Category not found" },
                { status: 404 },
            );
        }

        const camelCategory = toCamelKeys(categoryData);
        const response = { success: true, category: camelCategory };
        const parsed = DeleteCategoryResponse.safeParse(response);
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
        console.error("Categories DELETE error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
