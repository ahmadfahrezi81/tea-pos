import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys, toSnakeKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListOrdersParams {
    tenantId: string;
    storeId?: string;
    date?: string;
    tzOffset?: number;
}

export interface CreateOrderItem {
    productId: string;
    quantity: number;
    unitPrice: number;
}

export interface CreateOrderParams {
    tenantId: string;
    userId: string;
    storeId: string;
    items: CreateOrderItem[];
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listOrders(
    supabase: SupabaseClient,
    params: ListOrdersParams,
) {
    const { tenantId, storeId, date } = params;
    const TZ = params.tzOffset ?? Number(process.env.TIMEZONE_OFFSET ?? 7);

    let query = supabase
        .from("store_orders")
        .select(
            `*, stores(name), users(full_name), store_order_items(*, tenant_products(name))`,
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (storeId) query = query.eq("store_id", storeId);

    if (date) {
        const pad = String(TZ).padStart(2, "0");
        const start = new Date(`${date}T00:00:00+${pad}:00`).toISOString();
        const end = new Date(`${date}T23:59:59+${pad}:00`).toISOString();
        query = query.gte("created_at", start).lte("created_at", end);
    }

    const { data, error } = await query;
    if (error) throw error;
    return toCamelKeys(data ?? []);
}

export async function createOrder(
    supabase: SupabaseClient,
    params: CreateOrderParams,
) {
    const { tenantId, userId, storeId, items } = params;

    const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, tenant_id")
        .eq("id", storeId)
        .eq("tenant_id", tenantId)
        .single();

    if (storeError || !store)
        throw new Error("Store not found or access denied");

    const { data: storeAccess } = await supabase
        .from("user_store_assignments")
        .select("id")
        .eq("user_id", userId)
        .eq("store_id", storeId)
        .single();

    if (!storeAccess)
        throw new Error("Access denied - not assigned to this store");

    const productIds = items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
        .from("tenant_products")
        .select("id, price, is_active")
        .in("id", productIds)
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

    if (productsError) throw new Error("Error validating products");
    if (!products || products.length !== productIds.length)
        throw new Error("Some products are invalid or inactive");

    const productMap = new Map(products.map((p) => [p.id, p.price]));
    for (const item of items) {
        const dbPrice = productMap.get(item.productId);
        if (dbPrice === undefined)
            throw new Error(`Product ${item.productId} not found or inactive`);
        if (Math.abs(dbPrice - item.unitPrice) > 0.01) {
            throw new Error(
                `Price mismatch for product ${item.productId}. Expected ${dbPrice}, got ${item.unitPrice}`,
            );
        }
    }

    const totalAmount = items.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0,
    );

    const orderPayload = toSnakeKeys({
        storeId,
        userId,
        totalAmount,
        tenantId: store.tenant_id,
    });
    const { data: orderData, error: orderError } = await supabase
        .from("store_orders")
        .insert(orderPayload)
        .select()
        .single();

    if (orderError || !orderData)
        throw new Error(orderError?.message ?? "Order insert failed");

    const orderItemsPayload = toSnakeKeys(
        items.map((i) => ({
            orderId: orderData.id,
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.unitPrice * i.quantity,
            tenantId: store.tenant_id,
        })),
    );

    const { error: itemsError } = await supabase
        .from("store_order_items")
        .insert(orderItemsPayload);
    if (itemsError) throw new Error(itemsError.message);

    const totalCups = items.reduce((sum, i) => sum + i.quantity, 0);
    const log = createLogger(supabase, { tenantId: store.tenant_id, userId, storeId });
    log("order_created", {
        refId: orderData.id as string,
        refTable: "store_orders",
        metadata: {
            total_amount: totalAmount,
            total_cups: totalCups,
            payment_method: orderData.payment_method,
        },
    });

    return { orderId: orderData.id as string, totalAmount };
}
