import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys, toSnakeKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ListOrdersParams {
    tenantId: string;
    storeId?: string;
    date?: string;
    limit?: number;
    tzOffset?: number;
}

/**
 * The list is newest-first and sellers look at the most recent handful, so the
 * first page only needs to cover a scroll or two. A day rarely passes ~200
 * orders, which is why "show all" is a single follow-up fetch rather than a
 * ladder of page sizes — one more request gets the whole day.
 */
const DEFAULT_LIMIT = 25;

/** Safety net for the "show all" fetch, not an expected size. */
const MAX_LIMIT = 500;

/**
 * Aliased to camelCase in the query so rows arrive as `OrderResponse` with no
 * key-conversion pass. Must stay in step with that schema: its fields are
 * `.nullable()`, not `.optional()`, so a dropped column fails the parse.
 *
 * `stores(name)` is deliberately absent — it repeated one string on every row
 * and `StoreContext` already holds the store. `users(fullName)` stays: the
 * seller genuinely varies per order.
 */
const ORDER_COLUMNS = `
    id,
    storeId:store_id,
    userId:user_id,
    totalAmount:total_amount,
    paymentMethod:payment_method,
    tenantId:tenant_id,
    createdAt:created_at,
    users(fullName:full_name),
    storeOrderItems:store_order_items(
        id, quantity,
        orderId:order_id,
        productId:product_id,
        unitPrice:unit_price,
        totalPrice:total_price,
        tenantId:tenant_id,
        createdAt:created_at,
        tenantProducts:tenant_products(name)
    )
`;

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
    const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let query = supabase
        .from("store_orders")
        .select(ORDER_COLUMNS)
        .eq("tenant_id", tenantId)
        // Newest first — the UI shows the most recent at the top and scrolls
        // back through the day, so a plain `limit` takes the right end.
        .order("created_at", { ascending: false })
        .limit(limit);

    if (storeId) query = query.eq("store_id", storeId);

    if (date) {
        const pad = String(TZ).padStart(2, "0");
        const start = new Date(`${date}T00:00:00+${pad}:00`).toISOString();
        const end = new Date(`${date}T23:59:59+${pad}:00`).toISOString();
        query = query.gte("created_at", start).lte("created_at", end);
    }

    const [{ data, error }, totals] = await Promise.all([
        query,
        getDayTotals(supabase, { tenantId, storeId, date }),
    ]);

    if (error) throw error;
    return { orders: data ?? [], totals };
}

/**
 * The day's running totals, read from the summary row rather than summed from
 * the orders array.
 *
 * This is what makes the limit safe. The card above the list, and the
 * `Order #N` label on each row, both describe the *whole day* — deriving
 * either from a truncated array would quietly under-report, which is the trap
 * the previous attempt at this fell into. `createOrder` already maintains
 * these totals incrementally, so this is a single indexed row read.
 */
async function getDayTotals(
    supabase: SupabaseClient,
    { tenantId, storeId, date }: { tenantId: string; storeId?: string; date?: string },
) {
    const empty = { totalOrders: 0, totalSales: 0, totalCups: 0 };
    if (!storeId || !date) return empty;

    const { data } = await supabase
        .from("store_daily_summaries")
        .select("totalOrders:total_orders, totalSales:total_sales, totalCups:total_cups")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .eq("date", date)
        .maybeSingle();

    return (data as unknown as typeof empty | null) ?? empty;
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

    const totalCups = items.reduce((sum, i) => sum + i.quantity, 0);

    const TZ = Number(process.env.TIMEZONE_OFFSET ?? 7);
    const todayStr = new Date(new Date().getTime() + TZ * 3600000).toISOString().split("T")[0];

    const { data: activeSummary } = await supabase
        .from("store_daily_summaries")
        .select("id, total_sales, total_orders, total_cups, expected_cash")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("date", todayStr)
        .is("closed_at", null)
        .maybeSingle();

    const orderPayload = toSnakeKeys({
        storeId,
        userId,
        totalAmount,
        tenantId: store.tenant_id,
        dailySummaryId: activeSummary?.id ?? null,
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

    if (activeSummary) {
        await supabase
            .from("store_daily_summaries")
            .update({
                total_sales: activeSummary.total_sales + totalAmount,
                total_orders: activeSummary.total_orders + 1,
                total_cups: activeSummary.total_cups + totalCups,
                expected_cash: activeSummary.expected_cash + totalAmount,
            })
            .eq("id", activeSummary.id)
            .eq("tenant_id", tenantId);
    }

    const log = createLogger(supabase, {
        tenantId: store.tenant_id,
        userId,
        storeId,
        dailySummaryId: activeSummary?.id,
    });
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
