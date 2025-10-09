//app/api/analytics/product-sales/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import {
    ProductSalesQuery,
    ProductSalesResponse,
} from "@/lib/schemas/analytics";
import { getCurrentTenantId } from "@/lib/tenant";

async function fetchAllOrderItems(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    storeId: string,
    tenantId: string,
    startDate: string,
    endDate: string
) {
    const pageSize = 1000;
    let from = 0;
    let to = pageSize - 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allOrderItems: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("order_items")
            .select(
                `
                id,
                quantity,
                product_id,
                products(name),
                order_id,
                orders!inner(store_id, created_at)
            `
            )
            .eq("tenant_id", tenantId)
            .eq("orders.store_id", storeId)
            .gte("orders.created_at", startDate)
            .lte("orders.created_at", endDate)
            .range(from, to);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allOrderItems = allOrderItems.concat(data);
        from += pageSize;
        to += pageSize;
    }

    return allOrderItems;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const searchParams = request.nextUrl.searchParams;

        // ✅ Validate query parameters
        const queryValidation = ProductSalesQuery.safeParse({
            storeId: searchParams.get("storeId"),
            month: searchParams.get("month"),
        });

        if (!queryValidation.success) {
            return NextResponse.json(
                {
                    error: "Invalid query parameters",
                    details: queryValidation.error.format(),
                },
                { status: 400 }
            );
        }

        const { storeId, month } = queryValidation.data;

        // ✅ Parse year & month safely
        const [year, monthNum] = month.split("-");
        const parsedYear = parseInt(year, 10);
        const parsedMonth = parseInt(monthNum, 10);

        // ✅ Calculate first and last day of month
        const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1));
        const endDate = new Date(
            Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59)
        );

        // ✅ Fetch order items in pages
        const orderItems = await fetchAllOrderItems(
            supabase,
            storeId,
            currentTenantId,
            startDate.toISOString(),
            endDate.toISOString()
        );

        // ✅ Aggregate by product
        const productData: Record<string, { name: string; quantity: number }> =
            {};

        for (const item of orderItems) {
            if (!item.product_id || !item.products?.name) continue;

            const productId = item.product_id;
            const productName = item.products.name;
            const quantity = item.quantity || 0;

            if (!productData[productId]) {
                productData[productId] = { name: productName, quantity: 0 };
            }

            productData[productId].quantity += quantity;
        }

        // ✅ Calculate total quantity
        const totalQuantity = Object.values(productData).reduce(
            (sum, product) => sum + product.quantity,
            0
        );

        // ✅ Convert to array and add percentages
        const chartData = Object.entries(productData)
            .map(([productId, { name, quantity }]) => ({
                productId,
                productName: name,
                quantity,
                percentage:
                    totalQuantity > 0
                        ? Math.round((quantity / totalQuantity) * 1000) / 10 // Round to 1 decimal
                        : 0,
            }))
            .filter((item) => item.quantity > 0) // Exclude products with 0 sales
            .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

        // ✅ Validate with Zod response schema
        const parsedResponse = ProductSalesResponse.safeParse({
            data: chartData,
            totalQuantity,
        });

        if (!parsedResponse.success) {
            console.error(
                "ProductSalesResponse validation failed:",
                parsedResponse.error
            );
            return NextResponse.json(
                {
                    error: "Invalid response shape",
                    details: parsedResponse.error.format(),
                },
                { status: 500 }
            );
        }

        return NextResponse.json(parsedResponse.data, { status: 200 });
    } catch (error) {
        console.error("Product sales error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
