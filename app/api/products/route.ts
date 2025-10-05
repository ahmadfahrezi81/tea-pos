// // app/api/products/route.ts
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { getCurrentTenantId } from "@/lib/tenant";
// import { NextRequest, NextResponse } from "next/server";

// export async function GET(req: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const { searchParams } = new URL(req.url);
//         const showAll = searchParams.get("all") === "true";

//         let query = supabase
//             .from("products")
//             .select("*")
//             .eq("tenant_id", currentTenantId)
//             .order("name");

//         if (!showAll) {
//             query = query.eq("is_active", true);
//         }

//         const { data, error } = await query;

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         return NextResponse.json({ products: data });
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function POST(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const body = await request.json();

//         const { name, price, image_url, is_main } = body;

//         if (!name || !price) {
//             return NextResponse.json(
//                 { error: "Name and price are required" },
//                 { status: 400 }
//             );
//         }

//         // Check if user is authenticated
//         const {
//             data: { user },
//             error: userError,
//         } = await supabase.auth.getUser();
//         if (userError || !user) {
//             return NextResponse.json(
//                 { error: "Unauthorized" },
//                 { status: 401 }
//             );
//         }

//         const { data, error } = await supabase
//             .from("products")
//             .insert({
//                 name,
//                 price: parseFloat(price),
//                 image_url: image_url || null,
//                 is_main: is_main !== undefined ? is_main : false,
//                 tenant_id: currentTenantId,
//             })
//             .select()
//             .single();

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         return NextResponse.json({ success: true, product: data });
//     } catch (error) {
//         console.log(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function PUT(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const body = await request.json();

//         const { id, name, price, image_url, is_active, is_main } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Product ID is required" },
//                 { status: 400 }
//             );
//         }

//         // Check if user is authenticated
//         const {
//             data: { user },
//             error: userError,
//         } = await supabase.auth.getUser();
//         if (userError || !user) {
//             return NextResponse.json(
//                 { error: "Unauthorized" },
//                 { status: 401 }
//             );
//         }

//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         const updateData: any = {};
//         if (name !== undefined) updateData.name = name;
//         if (price !== undefined) updateData.price = parseFloat(price);
//         if (image_url !== undefined) updateData.image_url = image_url;
//         if (is_active !== undefined) updateData.is_active = is_active;
//         if (is_main !== undefined) updateData.is_main = is_main;
//         updateData.updated_at = new Date().toISOString();

//         const { data, error } = await supabase
//             .from("products")
//             .update(updateData)
//             .eq("id", id)
//             .eq("tenant_id", currentTenantId)
//             .select()
//             .single();

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         if (!data) {
//             return NextResponse.json(
//                 { error: "Product not found" },
//                 { status: 404 }
//             );
//         }

//         return NextResponse.json({ success: true, product: data });
//     } catch (error) {
//         console.log(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// export async function DELETE(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const currentTenantId = await getCurrentTenantId();
//         const body = await request.json();

//         const { id } = body;

//         if (!id) {
//             return NextResponse.json(
//                 { error: "Product ID is required" },
//                 { status: 400 }
//             );
//         }

//         // Check if user is authenticated
//         const {
//             data: { user },
//             error: userError,
//         } = await supabase.auth.getUser();
//         if (userError || !user) {
//             return NextResponse.json(
//                 { error: "Unauthorized" },
//                 { status: 401 }
//             );
//         }

//         const { data, error } = await supabase
//             .from("products")
//             .delete()
//             .eq("id", id)
//             .eq("tenant_id", currentTenantId)
//             .select()
//             .single();

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         if (!data) {
//             return NextResponse.json(
//                 { error: "Product not found" },
//                 { status: 404 }
//             );
//         }

//         return NextResponse.json({ success: true, product: data });
//     } catch (error) {
//         console.log(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// app/api/products/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateProductInput,
    UpdateProductInput,
    ListProductsQuery,
    ProductListResponse,
    CreateProductResponse,
    UpdateProductResponse,
    DeleteProductResponse,
} from "@/lib/schemas/products";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/products
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListProductsQuery.safeParse(
            Object.fromEntries(searchParams)
        );
        if (!queryResult.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryResult.error.format(),
                },
                { status: 400 }
            );
        }

        const { all } = queryResult.data;

        let query = supabase
            .from("products")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .order("name");

        if (!all) {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = ProductListResponse.safeParse({ products: camelData });
        if (!parsed.success) {
            console.error("Products response validation failed:", parsed.error);
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
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
                { status: 400 }
            );
        }

        const { name, price, imageUrl, isMain } = result.data;

        // Check if user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Insert product with tenant_id
        const productPayload = toSnakeKeys({
            name,
            price,
            imageUrl: imageUrl || null,
            isMain: isMain !== undefined ? isMain : false,
            tenantId: currentTenantId,
        });

        const { data: productData, error: productError } = await supabase
            .from("products")
            .insert(productPayload)
            .select()
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product insert failed" },
                { status: 400 }
            );
        }

        // Validate response
        const camelProduct = toCamelKeys(productData);
        const response = { success: true, product: camelProduct };
        const parsed = CreateProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
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
                { status: 400 }
            );
        }

        const { id, name, price, imageUrl, isActive, isMain } = result.data;

        // Check if user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Build update payload (only include provided fields)
        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name;
        if (price !== undefined) updates.price = price;
        if (imageUrl !== undefined) updates.image_url = imageUrl;
        if (isActive !== undefined) updates.is_active = isActive;
        if (isMain !== undefined) updates.is_main = isMain;
        updates.updated_at = new Date().toISOString();

        if (Object.keys(updates).length === 1) {
            // Only updated_at
            return NextResponse.json(
                { error: "No fields to update" },
                { status: 400 }
            );
        }

        const { data: productData, error: productError } = await supabase
            .from("products")
            .update(updates)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product not found" },
                { status: 404 }
            );
        }

        // Validate response
        const camelProduct = toCamelKeys(productData);
        const response = { success: true, product: camelProduct };
        const parsed = UpdateProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
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
                { status: 400 }
            );
        }

        // Check if user is authenticated
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { data: productData, error: productError } = await supabase
            .from("products")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (productError || !productData) {
            return NextResponse.json(
                { error: productError?.message || "Product not found" },
                { status: 404 }
            );
        }

        // Validate response
        const camelProduct = toCamelKeys(productData);
        const response = { success: true, product: camelProduct };
        const parsed = DeleteProductResponse.safeParse(response);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsed.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsed.data);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
