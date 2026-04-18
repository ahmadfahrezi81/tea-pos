// app/api/payments/qris/route.ts
import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import { createAdminClient } from "@/lib/server/supabase/admin";
import { getCurrentTenantId } from "@/lib/server/config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    CreateQrisPaymentInput,
    CreateQrisPaymentResponse,
} from "@/lib/shared/schemas/payments";

// ============================================================================
// POST /api/payments/qris
// ============================================================================
export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const currentTenantId = await getCurrentTenantId();
        const body = await request.json();

        const result = CreateQrisPaymentInput.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: "Validation failed", details: result.error.format() },
                { status: 400 },
            );
        }

        const { storeId, items } = result.data;

        // auth
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        // verify store belongs to tenant
        const { data: store, error: storeError } = await supabase
            .from("stores")
            .select("id, tenant_id")
            .eq("id", storeId)
            .eq("tenant_id", currentTenantId)
            .single();

        if (storeError || !store) {
            return NextResponse.json(
                { error: "Store not found or access denied" },
                { status: 404 },
            );
        }

        // seller role check
        const { data: storeAccess } = await supabase
            .from("user_store_assignments")
            .select("id")
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .eq("role", "seller")
            .single();

        if (!storeAccess) {
            return NextResponse.json(
                { error: "Access denied - seller role required" },
                { status: 403 },
            );
        }

        // validate products belong to tenant and are active
        const productIds = items.map((i) => i.productId);
        const { data: products, error: productsError } = await supabase
            .from("products")
            .select("id, price, is_active")
            .in("id", productIds)
            .eq("tenant_id", currentTenantId)
            .eq("is_active", true);

        if (
            productsError ||
            !products ||
            products.length !== productIds.length
        ) {
            return NextResponse.json(
                { error: "Some products are invalid or inactive" },
                { status: 400 },
            );
        }

        // validate prices match DB
        const productMap = new Map(products.map((p) => [p.id, p.price]));
        for (const item of items) {
            const dbPrice = productMap.get(item.productId);
            if (dbPrice === undefined) {
                return NextResponse.json(
                    { error: `Product ${item.productId} not found` },
                    { status: 400 },
                );
            }
            if (Math.abs(dbPrice - item.unitPrice) > 0.01) {
                return NextResponse.json(
                    { error: `Price mismatch for product ${item.productId}` },
                    { status: 400 },
                );
            }
        }

        // calculate total
        const totalAmount = items.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0,
        );

        // expire any existing pending payments for this user+store
        // so old QRs don't linger
        const adminSupabase = createAdminClient();
        await adminSupabase
            .from("payments")
            .update({ status: "expired" })
            .eq("user_id", user.id)
            .eq("store_id", storeId)
            .eq("status", "pending");

        // unique reference id
        const referenceId = `tea-pos-${storeId.slice(0, 8)}-${Date.now()}`;

        // call Xendit
        const xenditResponse = await fetch("https://api.xendit.co/qr_codes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-version": "2022-07-31",
                Authorization: `Basic ${Buffer.from(
                    `${process.env.XENDIT_API_KEY}:`,
                ).toString("base64")}`,
            },
            body: JSON.stringify({
                reference_id: referenceId,
                type: "DYNAMIC",
                currency: "IDR",
                amount: totalAmount,
            }),
        });

        if (!xenditResponse.ok) {
            const xenditError = await xenditResponse.json();
            console.error("Xendit error:", xenditError);
            return NextResponse.json(
                { error: "Failed to create QR payment" },
                { status: 502 },
            );
        }

        const xenditData = await xenditResponse.json();

        // insert payment row with pending_items
        const { data: paymentData, error: paymentError } = await adminSupabase
            .from("payments")
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
            console.error("Payment insert error:", paymentError);
            return NextResponse.json(
                { error: "Failed to store payment" },
                { status: 500 },
            );
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
            console.error("Response validation failed:", parsed.error);
            return NextResponse.json(
                { error: "Invalid response shape" },
                { status: 500 },
            );
        }

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
