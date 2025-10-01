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

// app/api/orders/route.ts (GET + response validation)
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateOrderSchema,
    GetOrdersQuerySchema,
    OrdersResponseSchema,
    CreateOrderResponseSchema,
} from "@/lib/schemas/orders";
// import { toZonedTime } from "date-fns-tz";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);

        // Validate query parameters (now includes `date`)
        const queryResult = GetOrdersQuerySchema.safeParse(
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
            .order("created_at", { ascending: false });

        if (storeId) {
            query = query.eq("store_id", storeId);
        }

        // If date provided, filter by created_at range for that day
        // if (date) {
        //     // Build start/end ISO strings for the date.
        //     // NOTE: this uses the server's Date handling. See timezone caveat below.
        //     const startOfDay = new Date(`${date}T00:00:00`).toISOString();
        //     const endOfDay = new Date(`${date}T23:59:59.999`).toISOString();

        //     query = query
        //         .gte("created_at", startOfDay)
        //         .lte("created_at", endOfDay);
        // }

        if (date) {
            const start = new Date(`${date}T00:00:00+07:00`).toISOString(); // 2025-10-01T00:00:00+07:00
            const end = new Date(`${date}T23:59:59+07:00`).toISOString(); // 2025-10-01T23:59:59+07:00

            query = query.gte("created_at", start).lte("created_at", end);
        }

        // if (date) {
        //     const timeZone = "Asia/Jakarta";

        //     const startOfDay = toZonedTime(
        //         `${date}T00:00:00`,
        //         timeZone
        //     ).toISOString();
        //     const endOfDay = toZonedTime(
        //         `${date}T23:59:59.999`,
        //         timeZone
        //     ).toISOString();

        //     query = query
        //         .gte("created_at", startOfDay)
        //         .lte("created_at", endOfDay);
        // }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Validate response shape before returning to client
        const parsed = OrdersResponseSchema.safeParse({ orders: data || [] });
        if (!parsed.success) {
            console.error(
                "Orders response validation failed:",
                parsed.error.format()
            );
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

// export async function POST(request: NextRequest) {
//     try {
//         const supabase = await createRouteHandlerClient();
//         const body = await request.json();

//         // Validate request body
//         const result = CreateOrderSchema.safeParse(body);
//         if (!result.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: result.error.format() },
//                 { status: 400 }
//             );
//         }

//         const { storeId, items } = result.data;

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

//         // Verify user has access to this store
//         console.log("Checking seller access for:", {
//             userId: user.id,
//             storeId,
//         });

//         const { data: storeAccess, error: storeAccessError } = await supabase
//             .from("user_store_assignments")
//             .select("id, role")
//             .eq("user_id", user.id)
//             .eq("store_id", storeId)
//             .eq("role", "seller")
//             .single();

//         console.log("Seller access result:", { storeAccess, storeAccessError });

//         if (!storeAccess) {
//             return NextResponse.json(
//                 {
//                     error: "Access denied - seller role required for this store",
//                 },
//                 { status: 403 }
//             );
//         }

//         // Validate products exist and get current prices
//         const productIds = items.map((item) => item.productId);
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

//         if (products.length !== productIds.length) {
//             return NextResponse.json(
//                 { error: "Some products are invalid or inactive" },
//                 { status: 400 }
//             );
//         }

//         // Validate prices match (security check)
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

//         // Calculate total
//         const totalAmount = items.reduce(
//             (sum, item) => sum + item.unitPrice * item.quantity,
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
//         const orderItems = items.map((item) => ({
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

//         return NextResponse.json(
//             {
//                 success: true,
//                 orderId: orderData.id,
//                 totalAmount,
//             },
//             { status: 201 }
//         );
//     } catch (error) {
//         console.error(error);
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        // ✅ validate request body
        const result = CreateOrderSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 }
            );
        }

        const { storeId, items } = result.data;

        // Get current user
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

        // Verify user has access to this store
        console.log("Checking seller access for:", {
            userId: user.id,
            storeId,
        });

        const { data: storeAccess, error: storeAccessError } = await supabase
            .from("user_store_assignments")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .eq("role", "seller")
            .single();

        console.log("Seller access result:", { storeAccess, storeAccessError });

        if (!storeAccess) {
            return NextResponse.json(
                {
                    error: "Access denied - seller role required for this store",
                },
                { status: 403 }
            );
        }

        // Validate products exist and get current prices
        const productIds = items.map((item) => item.productId);
        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, price, is_active")
            .in("id", productIds)
            .eq("is_active", true);

        if (productsError) {
            return NextResponse.json(
                { error: "Error validating products" },
                { status: 400 }
            );
        }

        if (products.length !== productIds.length) {
            return NextResponse.json(
                { error: "Some products are invalid or inactive" },
                { status: 400 }
            );
        }

        // Validate prices match (security check)
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

        // Calculate total
        const totalAmount = items.reduce(
            (sum, item) => sum + item.unitPrice * item.quantity,
            0
        );

        // Create order
        const { data: orderData, error: orderError } = await supabase
            .from("orders")
            .insert({
                store_id: storeId,
                user_id: user.id,
                total_amount: totalAmount,
            })
            .select()
            .single();

        if (orderError) {
            return NextResponse.json(
                { error: orderError.message },
                { status: 400 }
            );
        }

        // Create order items
        const orderItems = items.map((item) => ({
            order_id: orderData.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
        }));

        const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) {
            return NextResponse.json(
                { error: itemsError.message },
                { status: 400 }
            );
        }

        // ✅ validate response shape
        const response = {
            success: true,
            orderId: orderData.id,
            totalAmount,
        };

        const parsed = CreateOrderResponseSchema.safeParse(response);
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
