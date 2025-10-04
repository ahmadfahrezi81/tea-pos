// //app/api/orders/route.ts
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { NextRequest, NextResponse } from "next/server";

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);
//         const storeId = searchParams.get("storeId");

//         let query = supabase
//             .from("orders")
//             .select(
//                 `
//         *,
//         stores(name),
//         profiles(full_name),
//         order_items(
//           *,
//           products(name)
//         )
//       `
//             )
//             .order("created_at", { ascending: false });

//         if (storeId) {
//             query = query.eq("store_id", storeId);
//         }

//         const { data, error } = await query;

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         return NextResponse.json({ orders: data });
//     } catch (error) {
//         console.log(error);

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

//         const { storeId, items } = body;

//         if (!storeId || !items || items.length === 0) {
//             return NextResponse.json(
//                 { error: "Store ID and items are required" },
//                 { status: 400 }
//             );
//         }

//         // Get current user
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

//         // Calculate total
//         const totalAmount = items.reduce(
//             // eslint-disable-next-line @typescript-eslint/no-explicit-any
//             (sum: number, item: any) => sum + item.unitPrice * item.quantity,
//             0
//         );

//         // Create order
//         const { data: orderData, error: orderError } = await supabase
//             .from("orders")
//             .insert({
//                 store_id: storeId,
//                 user_id: user.id,
//                 total_amount: totalAmount,
//             })
//             .select()
//             .single();

//         if (orderError) {
//             return NextResponse.json(
//                 { error: orderError.message },
//                 { status: 400 }
//             );
//         }

//         // Create order items
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         const orderItems = items.map((item: any) => ({
//             order_id: orderData.id,
//             product_id: item.productId,
//             quantity: item.quantity,
//             unit_price: item.unitPrice,
//             total_price: item.unitPrice * item.quantity,
//         }));

//         const { error: itemsError } = await supabase
//             .from("order_items")
//             .insert(orderItems);

//         if (itemsError) {
//             return NextResponse.json(
//                 { error: itemsError.message },
//                 { status: 400 }
//             );
//         }

//         return NextResponse.json({
//             success: true,
//             orderId: orderData.id,
//             totalAmount,
//         });
//     } catch (error) {
//         console.log(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// app/api/orders/route.ts
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { NextRequest, NextResponse } from "next/server";
// import { CreateOrderSchema, GetOrdersQuerySchema } from "@/lib/schemas/orders";

// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);

//         // Validate query parameters
//         const queryResult = GetOrdersQuerySchema.safeParse(
//             Object.fromEntries(searchParams)
//         );

//         if (!queryResult.success) {
//             return NextResponse.json(
//                 {
//                     error: "Invalid query parameters",
//                     details: queryResult.error.format(),
//                 },
//                 { status: 400 }
//             );
//         }

//         const { storeId } = queryResult.data;

//         let query = supabase
//             .from("orders")
//             .select(
//                 `
//                 *,
//                 stores(name),
//                 profiles(full_name),
//                 order_items(
//                   *,
//                   products(name)
//                 )
//               `
//             )
//             .order("created_at", { ascending: false });

//         if (storeId) {
//             query = query.eq("store_id", storeId);
//         }

//         const { data, error } = await query;

//         if (error) {
//             return NextResponse.json({ error: error.message }, { status: 400 });
//         }

//         return NextResponse.json({ orders: data || [] });
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// // app/api/orders/route.ts
// import { createRouteHandlerClient } from "@/lib/supabase/server";
// import { NextRequest, NextResponse } from "next/server";
// import {
//     CreateOrderInput,
//     ListOrdersQuery,
//     OrderListResponse,
//     CreateOrderResponse,
// } from "@/lib/schemas/orders";
// import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// // ============================================================================
// // GET /api/orders
// // ============================================================================
// export async function GET(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const { searchParams } = new URL(request.url);

//         const queryResult = ListOrdersQuery.safeParse(
//             Object.fromEntries(searchParams)
//         );
//         if (!queryResult.success) {
//             return NextResponse.json(
//                 {
//                     error: "Invalid query parameters",
//                     details: queryResult.error.format(),
//                 },
//                 { status: 400 }
//             );
//         }

//         const { storeId, date } = queryResult.data;

//         let query = supabase
//             .from("orders")
//             .select(
//                 `
//                 *,
//                 stores(name),
//                 profiles(full_name),
//                 order_items(*, products(name))
//             `
//             )
//             .order("created_at", { ascending: false });

//         if (storeId) query = query.eq("store_id", storeId);

//         if (date) {
//             const start = new Date(`${date}T00:00:00+07:00`).toISOString();
//             const end = new Date(`${date}T23:59:59+07:00`).toISOString();
//             query = query.gte("created_at", start).lte("created_at", end);
//         }

//         const { data, error } = await query;
//         if (error)
//             return NextResponse.json({ error: error.message }, { status: 400 });

//         const camelData = toCamelKeys(data || []);

//         const parsed = OrderListResponse.safeParse({ orders: camelData });
//         if (!parsed.success) {
//             console.error("Orders response validation failed:", parsed.error);
//             return NextResponse.json(
//                 {
//                     error: "Invalid response shape",
//                     details: parsed.error.format(),
//                 },
//                 { status: 500 }
//             );
//         }

//         return NextResponse.json(parsed.data);
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// // ============================================================================
// // POST /api/orders
// // ============================================================================
// export async function POST(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();

//         const result = CreateOrderInput.safeParse(body);
//         if (!result.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: result.error.format() },
//                 { status: 400 }
//             );
//         }

//         const { storeId, items } = result.data;

//         // current user
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

//         // store access check
//         const { data: storeAccess } = await supabase
//             .from("user_store_assignments")
//             .select("id, role")
//             .eq("user_id", user.id)
//             .eq("store_id", storeId)
//             .eq("role", "seller")
//             .single();

//         if (!storeAccess) {
//             return NextResponse.json(
//                 {
//                     error: "Access denied - seller role required for this store",
//                 },
//                 { status: 403 }
//             );
//         }

//         // validate products
//         const productIds = items.map((i) => i.productId);
//         const { data: products, error: productsError } = await supabase
//             .from("products")
//             .select("id, price, is_active")
//             .in("id", productIds)
//             .eq("is_active", true);

//         if (productsError) {
//             return NextResponse.json(
//                 { error: "Error validating products" },
//                 { status: 400 }
//             );
//         }
//         if (!products || products.length !== productIds.length) {
//             return NextResponse.json(
//                 { error: "Some products are invalid or inactive" },
//                 { status: 400 }
//             );
//         }

//         // check prices
//         const productMap = new Map(products.map((p) => [p.id, p.price]));
//         for (const item of items) {
//             const dbPrice = productMap.get(item.productId);
//             if (dbPrice === undefined) {
//                 return NextResponse.json(
//                     {
//                         error: `Product ${item.productId} not found or inactive.`,
//                     },
//                     { status: 400 }
//                 );
//             }
//             if (Math.abs(dbPrice - item.unitPrice) > 0.01) {
//                 return NextResponse.json(
//                     {
//                         error: `Price mismatch for product ${item.productId}. Expected ${dbPrice}, got ${item.unitPrice}`,
//                     },
//                     { status: 400 }
//                 );
//             }
//         }

//         // calculate total
//         const totalAmount = items.reduce(
//             (sum, i) => sum + i.unitPrice * i.quantity,
//             0
//         );

//         // insert order with snake_case helper
//         const orderPayload = toSnakeKeys({
//             storeId,
//             userId: user.id,
//             totalAmount,
//         });

//         const { data: orderData, error: orderError } = await supabase
//             .from("orders")
//             .insert(orderPayload)
//             .select()
//             .single();

//         if (orderError || !orderData) {
//             return NextResponse.json(
//                 { error: orderError?.message || "Order insert failed" },
//                 { status: 400 }
//             );
//         }

//         // insert items with snake_case helper
//         const orderItemsPayload = toSnakeKeys(
//             items.map((i) => ({
//                 orderId: orderData.id,
//                 productId: i.productId,
//                 quantity: i.quantity,
//                 unitPrice: i.unitPrice,
//                 totalPrice: i.unitPrice * i.quantity,
//             }))
//         );

//         const { error: itemsError } = await supabase
//             .from("order_items")
//             .insert(orderItemsPayload);

//         if (itemsError) {
//             return NextResponse.json(
//                 { error: itemsError.message },
//                 { status: 400 }
//             );
//         }

//         // validate response
//         const response = { success: true, orderId: orderData.id, totalAmount };
//         const parsed = CreateOrderResponse.safeParse(response);
//         if (!parsed.success) {
//             return NextResponse.json(
//                 {
//                     error: "Invalid response shape",
//                     details: parsed.error.format(),
//                 },
//                 { status: 500 }
//             );
//         }

//         return NextResponse.json(parsed.data, { status: 201 });
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// app/api/orders/route.ts
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateOrderInput,
    ListOrdersQuery,
    OrderListResponse,
    CreateOrderResponse,
} from "@/lib/schemas/orders";
import { toCamelKeys, toSnakeKeys } from "@/lib/utils/schemas";

// ============================================================================
// GET /api/orders
// ============================================================================
export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const queryResult = ListOrdersQuery.safeParse(
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

        const { storeId, date } = queryResult.data;

        let query = supabase
            .from("orders")
            .select(
                `
                *,
                stores(name),
                profiles(full_name),
                order_items(*, products(name))
            `
            )
            .eq("tenant_id", currentTenantId)
            .order("created_at", { ascending: false });

        if (storeId) query = query.eq("store_id", storeId);

        if (date) {
            const start = new Date(`${date}T00:00:00+07:00`).toISOString();
            const end = new Date(`${date}T23:59:59+07:00`).toISOString();
            query = query.gte("created_at", start).lte("created_at", end);
        }

        const { data, error } = await query;
        if (error)
            return NextResponse.json({ error: error.message }, { status: 400 });

        const camelData = toCamelKeys(data || []);

        const parsed = OrderListResponse.safeParse({ orders: camelData });
        if (!parsed.success) {
            console.error("Orders response validation failed:", parsed.error);
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
// POST /api/orders
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateOrderInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { storeId, items } = result.data;

        // current user
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

        // Fetch store and verify tenant ownership
        const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, tenant_id")
            .eq("id", storeId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (storeError || !store) {
            return NextResponse.json(
                { error: "Store not found or access denied" },
                { status: 404 }
            );
        }

        // store access check
        const { data: storeAccess } = await supabase
            .from("user_store_assignments")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .eq("role", "seller")
            .single();

        if (!storeAccess) {
            return NextResponse.json(
                {
                    error: "Access denied - seller role required for this store",
                },
                { status: 403 }
            );
        }

        // validate products (ensure they belong to current tenant)
        const productIds = items.map((i) => i.productId);
        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, price, is_active")
            .in("id", productIds)
            .eq("tenant_id", currentTenantId)
            .eq("is_active", true);

        if (productsError) {
            return NextResponse.json(
                { error: "Error validating products" },
                { status: 400 }
            );
        }
        if (!products || products.length !== productIds.length) {
            return NextResponse.json(
                { error: "Some products are invalid or inactive" },
                { status: 400 }
            );
        }

        // check prices
        const productMap = new Map(products.map((p) => [p.id, p.price]));
        for (const item of items) {
            const dbPrice = productMap.get(item.productId);
            if (dbPrice === undefined) {
                return NextResponse.json(
                    {
                        error: `Product ${item.productId} not found or inactive.`,
                    },
                    { status: 400 }
                );
            }
            if (Math.abs(dbPrice - item.unitPrice) > 0.01) {
                return NextResponse.json(
                    {
                        error: `Price mismatch for product ${item.productId}. Expected ${dbPrice}, got ${item.unitPrice}`,
                    },
                    { status: 400 }
                );
            }
        }

        // calculate total
        const totalAmount = items.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0
        );

        // insert order with tenant_id inherited from store
        const orderPayload = toSnakeKeys({
            storeId,
            userId: user.id,
            totalAmount,
            tenantId: store.tenant_id,
        });

        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert(orderPayload)
            .select()
            .single();

        if (orderError || !orderData) {
            return NextResponse.json(
                { error: orderError?.message || "Order insert failed" },
                { status: 400 }
            );
        }

        // insert items with tenant_id inherited from order
        const orderItemsPayload = toSnakeKeys(
            items.map((i) => ({
                orderId: orderData.id,
                productId: i.productId,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: i.unitPrice * i.quantity,
                tenantId: store.tenant_id,
            }))
        );

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItemsPayload);

        if (itemsError) {
            return NextResponse.json(
                { error: itemsError.message },
                { status: 400 }
            );
        }

        // validate response
        const response = { success: true, orderId: orderData.id, totalAmount };
        const parsed = CreateOrderResponse.safeParse(response);
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
