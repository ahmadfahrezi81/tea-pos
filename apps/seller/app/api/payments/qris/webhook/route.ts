import { getServiceClient } from "@/lib/supabase/service";
import { NextRequest } from "next/server";
import { XenditQrisWebhookPayload } from "@tea-pos/features/payments/schema";
import { ok, badRequest, unauthorized } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
    try {
        const webhookToken = request.headers.get("x-callback-token");
        if (webhookToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
            logger.error("POST /api/payments/qris/webhook invalid token");
            return unauthorized();
        }

        const body = await request.json();
        logger.info("POST /api/payments/qris/webhook", body);

        const result = XenditQrisWebhookPayload.safeParse(body);
        if (!result.success) {
            logger.error("POST /api/payments/qris/webhook invalid payload", result.error);
            return badRequest("Invalid payload");
        }

        const { qr_id, status, amount } = result.data.data;

        if (status !== "SUCCEEDED") {
            return ok({ success: true });
        }

        const supabase = getServiceClient();

        const { data: payment, error: paymentError } = await supabase
            .from("store_order_payments")
            .select("*")
            .eq("xendit_qr_id", qr_id)
            .eq("status", "pending")
            .single();

        if (paymentError || !payment) {
            logger.error("POST /api/payments/qris/webhook payment not found", { qr_id });
            return ok({ success: true });
        }

        const pendingItems = payment.pending_items as Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
        }> | null;

        if (!pendingItems || pendingItems.length === 0) {
            logger.error("POST /api/payments/qris/webhook no pending items", { paymentId: payment.id });
            return ok({ success: true });
        }

        const { data: orderData, error: orderError } = await supabase
            .from("store_orders")
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
            logger.error("POST /api/payments/qris/webhook order creation failed", orderError);
            // always 200 to Xendit
            return ok({ success: true });
        }

        const orderItems = pendingItems.map((item) => ({
            order_id: orderData.id,
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.unitPrice * item.quantity,
            tenant_id: payment.tenant_id,
        }));

        const { error: itemsError } = await supabase.from("store_order_items").insert(orderItems);
        if (itemsError) {
            logger.error("POST /api/payments/qris/webhook order items failed", itemsError);
        }

        const { error: updateError } = await supabase
            .from("store_order_payments")
            .update({
                status: "succeeded",
                order_id: orderData.id,
                pending_items: null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

        if (updateError) {
            logger.error("POST /api/payments/qris/webhook payment update failed", updateError);
        }

        return ok({ success: true });
    } catch (error) {
        logger.error("POST /api/payments/qris/webhook", error);
        // always 200 to Xendit to prevent retries on our bugs
        return ok({ success: true });
    }
}
