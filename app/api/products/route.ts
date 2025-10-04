// // /api/products/route.ts
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { NextRequest, NextResponse } from "next/server";

// export async function GET(req: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(req.url);
//         const showAll = searchParams.get("all") === "true";

//         let query = supabase.from("products").select("*").order("name");

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
//         const body = await request.json();

//         // Extract ALL fields including image_url and is_main
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
//                 image_url: image_url || null, // Handle optional image_url
//                 is_main: is_main !== undefined ? is_main : false, // Default to false if not provided
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
//         const body = await request.json();

//         // Extract ALL fields including image_url and is_main
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
//         if (is_active !== undefined) updateData.is_active = is_active; // Keep this for status toggle
//         if (is_main !== undefined) updateData.is_main = is_main; // Add this for main product toggle
//         updateData.updated_at = new Date().toISOString();

//         const { data, error } = await supabase
//             .from("products")
//             .update(updateData)
//             .eq("id", id)
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

// export async function DELETE(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
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

// app/api/products/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(req.url);
        const showAll = searchParams.get("all") === "true";

        let query = supabase
            .from("products")
            .select("*")
            .eq("tenant_id", currentTenantId)
            .order("name");

        if (!showAll) {
            query = query.eq("is_active", true);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ products: data });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const { name, price, image_url, is_main } = body;

        if (!name || !price) {
            return NextResponse.json(
                { error: "Name and price are required" },
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

        const { data, error } = await supabase
            .from("products")
            .insert({
                name,
                price: parseFloat(price),
                image_url: image_url || null,
                is_main: is_main !== undefined ? is_main : false,
                tenant_id: currentTenantId,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, product: data });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const { id, name, price, image_url, is_active, is_main } = body;

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        if (image_url !== undefined) updateData.image_url = image_url;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (is_main !== undefined) updateData.is_main = is_main;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from("products")
            .update(updateData)
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, product: data });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

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

        const { data, error } = await supabase
            .from("products")
            .delete()
            .eq("id", id)
            .eq("tenant_id", currentTenantId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data) {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, product: data });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
