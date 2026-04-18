// app/api/summaries/breakdown/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const { searchParams } = new URL(request.url);

        const summaryId = searchParams.get("summaryId");
        if (!summaryId) {
            return NextResponse.json(
                { error: "summaryId is required" },
                { status: 400 },
            );
        }

        // ─── Get summary to extract store_id and date ──────────────────
        const { data: summary, error: summaryError } = await supabase
            .from("daily_summaries")
            .select("store_id, date")
            .eq("id", summaryId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (summaryError || !summary) {
            return NextResponse.json(
                { error: "Summary not found" },
                { status: 404 },
            );
        }

        // ─── Fetch orders for that store + date ────────────────────────
        const { data: orders, error: ordersError } = await supabase
            .from("orders")
            .select(
                `
                id,
                total_amount,
                order_items (
                    quantity,
                    total_price,
                    products ( name )
                )
            `,
            )
            .eq("store_id", summary.store_id)
            .eq("tenant_id", currentTenantId)
            .gte("created_at", `${summary.date}T00:00:00Z`)
            .lte("created_at", `${summary.date}T23:59:59Z`);

        if (ordersError) {
            return NextResponse.json(
                { error: ordersError.message },
                { status: 400 },
            );
        }

        // ─── Build breakdown ───────────────────────────────────────────
        const breakdown: Record<string, { quantity: number; revenue: number }> =
            {};

        (orders ?? []).forEach((order) => {
            order.order_items?.forEach(
                (item: {
                    products: { name: string } | null;
                    quantity: number;
                    total_price: number;
                }) => {
                    const name =
                        (item.products as { name: string } | null)?.name ??
                        "Unknown Product";
                    if (!breakdown[name]) {
                        breakdown[name] = { quantity: 0, revenue: 0 };
                    }
                    breakdown[name].quantity += item.quantity;
                    breakdown[name].revenue += item.total_price;
                },
            );
        });

        return NextResponse.json({ breakdown });
    } catch (error) {
        console.error("[GET /api/summaries/breakdown]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
