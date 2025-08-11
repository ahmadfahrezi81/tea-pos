import { createRouteHandlerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const { searchParams } = new URL(request.url);
        const storeId = searchParams.get("storeId");

        let query = supabase
            .from("orders")
            .select(
                `
        *,
        stores(name),
        profiles(full_name),
        order_items(
          *,
          products(name)
        )
      `
            )
            .order("created_at", { ascending: false });

        if (storeId) {
            query = query.eq("store_id", storeId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ orders: data });
    } catch (error) {
        console.log(error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const body = await request.json();

        const { storeId, items } = body;

        if (!storeId || !items || items.length === 0) {
            return NextResponse.json(
                { error: "Store ID and items are required" },
                { status: 400 }
            );
        }

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

        // Calculate total
        const totalAmount = items.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sum: number, item: any) => sum + item.unitPrice * item.quantity,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderItems = items.map((item: any) => ({
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

        return NextResponse.json({
            success: true,
            orderId: orderData.id,
            totalAmount,
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
