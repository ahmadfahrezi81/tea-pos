import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreateQrisPaymentInput,
    CreateQrisPaymentResponse,
} from "@tea-pos/features/payments/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();

        const paymentId = new URL(request.url).searchParams.get("paymentId");
        if (!paymentId) return badRequest("paymentId is required");

        const { data, error } = await supabase
            .from("store_order_payments")
            .select("status")
            .eq("id", paymentId)
            .eq("user_id", user.id)
            .single();

        if (error || !data) return err("Payment not found", 404);

        return ok({ status: data.status });
    } catch (error) {
        return handleError("GET /api/payments/qris", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateQrisPaymentInput.safeParse(body);
        if (!result.success) return badRequest("Validation failed");

        const { storeId, items } = result.data;

        const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, tenant_id")
            .eq("id", storeId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (storeError || !store) return err("Store not found or access denied", 404);

        const { data: storeAccess } = await supabase
            .from("user_store_assignments")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .single();

        if (!storeAccess) return err("Access denied", 403);

        const productIds = items.map((i) => i.productId);
        const { data: products, error: productsError } = await supabase
            .from("tenant_products")
            .select("id, price, is_active")
            .in("id", productIds)
            .eq("tenant_id", currentTenantId)
            .eq("is_active", true);

        if (productsError || !products || products.length !== productIds.length) {
            return badRequest("Some products are invalid or inactive");
        }

        const productMap = new Map(products.map((p) => [p.id, p.price]));
        for (const item of items) {
            const dbPrice = productMap.get(item.productId);
            if (dbPrice === undefined) return badRequest(`Product ${item.productId} not found`);
            if (Math.abs(dbPrice - item.unitPrice) > 0.01) return badRequest(`Price mismatch for product ${item.productId}`);
        }

        const totalAmount = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

        await supabase
            .from("store_order_payments")
            .update({ status: "expired" })
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .eq("status", "pending");

        const referenceId = `tea-pos-${storeId.slice(0, 8)}-${Date.now()}`;

        const xenditResponse = await fetch("https://api.xendit.co/qr_codes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-version": "2022-07-31",
                Authorization: `Basic ${Buffer.from(`${process.env.XENDIT_API_KEY}:`).toString("base64")}`,
            },
            body: JSON.stringify({
                reference_id: referenceId,
                type: "DYNAMIC",
                currency: "IDR",
                amount: totalAmount,
            }),
        });

        if (!xenditResponse.ok) {
            logger.error("POST /api/payments/qris Xendit error", await xenditResponse.json());
            return err("Failed to create QR payment", 502);
        }

        const xenditData = await xenditResponse.json();

        const { data: paymentData, error: paymentError } = await supabase
            .from("store_order_payments")
            .insert({
                xendit_qr_id: xenditData.id,
                xendit_reference_id: referenceId,
                qr_string: xenditData.qr_string,
                amount: totalAmount,
                status: "pending",
                store_id: storeId,
                tenant_id: store.tenant_id,
                user_id: user.id,
                expires_at: xenditData.expires_at ?? null,
                pending_items: items.map((i) => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            })
            .select()
            .single();

        if (paymentError || !paymentData) {
            logger.error("POST /api/payments/qris payment insert", paymentError);
            return err("Failed to store payment");
        }

        const response = {
            success: true,
            paymentId: paymentData.id,
            xenditQrId: xenditData.id,
            qrString: xenditData.qr_string,
            amount: totalAmount,
            expiresAt: xenditData.expires_at ?? "",
            referenceId,
        };

        const parsed = CreateQrisPaymentResponse.safeParse(response);
        if (!parsed.success) {
            logger.error("POST /api/payments/qris response validation", parsed.error);
            return err("Invalid response shape");
        }

        return ok(parsed.data, 201);
    } catch (error) {
        return handleError("POST /api/payments/qris", error);
    }
}
