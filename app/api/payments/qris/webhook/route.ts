// app/api/payments/qris/webhook/route.ts
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { XenditQrisWebhookPayload } from "@/lib/schemas/payments";

// ============================================================================
// POST /api/payments/qris/webhook
// Xendit calls this when a QR payment is paid
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        // verify webhook token
        const webhookToken = request.headers.get("x-callback-token");
        if (webhookToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
            console.error("Invalid webhook token");
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const body = await request.json();

        const result = XenditQrisWebhookPayload.safeParse(body);
        if (!result.success) {
            console.error("Webhook payload invalid:", result.error);
            return NextResponse.json(
                { error: "Invalid payload" },
                { status: 400 },
            );
        }

        const { qr_id, status, amount } = result.data;

        // only process SUCCEEDED
        if (status !== "SUCCEEDED") {
            return NextResponse.json({ success: true });
        }

        const adminSupabase = createAdminClient();

        // fetch payment row
        const { data: payment, error: paymentError } = await adminSupabase
            .from("payments")
            .select("*")
            .eq("xendit_qr_id", qr_id)
            .eq("status", "pending")
            .single();

        if (paymentError || !payment) {
            console.error("Payment not found for qr_id:", qr_id);
            // return 200 to Xendit anyway — don't retry
            return NextResponse.json({ success: true });
        }

        // parse pending_items
        const pendingItems = payment.pending_items as Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
        }> | null;

        if (!pendingItems || pendingItems.length === 0) {
            console.error("No pending items for payment:", payment.id);
            return NextResponse.json({ success: true });
        }

        // create order
        const { data: orderData, error: orderError } = await adminSupabase
            .from("orders")
            .insert({
                store_id: payment.store_id,
                user_id: payment.user_id,
                total_amount: amount,
                tenant_id: payment.tenant_id,
                payment_method: "qris",
            })
            .select()
            .single();

        if (orderError || !orderData) {
            console.error("Order creation failed:", orderError);
            return NextResponse.json(
                { error: "Order creation failed" },
                { status: 500 },
            );
        }

        // create order_items
        const orderItems = pendingItems.map((item) => ({
            order_id: orderData.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
            tenant_id: payment.tenant_id,
        }));

        const { error: itemsError } = await adminSupabase
            .from("order_items")
            .insert(orderItems);

        if (itemsError) {
            console.error("Order items creation failed:", itemsError);
            // order exists but items failed — log and continue
            // in production you'd want to alert on this
        }

        // update payment — link order_id, clear pending_items, mark succeeded
        const { error: updateError } = await adminSupabase
            .from("payments")
            .update({
                status: "succeeded",
                order_id: orderData.id,
                pending_items: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

        if (updateError) {
            console.error("Payment update failed:", updateError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Webhook error:", error);
        // always return 200 to Xendit to prevent retries on our bugs
        return NextResponse.json({ success: true });
    }
}
