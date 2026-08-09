import type { SupabaseClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthSalesParams {
    tenantId: string;
    storeId: string;
    month: string;
    tzOffset?: number;
}

export interface HourlySalesParams {
    tenantId: string;
    storeId: string;
    date: string;
    tzOffset?: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * The month's boundaries as UTC instants, derived from app-local midnight.
 *
 * The previous version built these with `Date.UTC`, which is app time only at
 * offset 0: at +7 it dropped the first seven hours of the 1st and pulled in the
 * first seven of the next month.
 */
function monthRangeIso(month: string, tz: number) {
    const [year, monthNum] = month.split("-").map((v) => parseInt(v, 10));
    const pad = String(tz).padStart(2, "0");
    const nextMonth =
        monthNum === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

    return {
        start: new Date(`${month}-01T00:00:00+${pad}:00`).toISOString(),
        end: new Date(`${nextMonth}T00:00:00+${pad}:00`).toISOString(),
    };
}

interface MonthOrderRow {
    store_order_items: Array<{ product_id: string | null; quantity: number }> | null;
}

/**
 * The month's orders with their items embedded.
 *
 * Reads down from `store_orders`, never up from `store_order_items`. The old
 * helper did the reverse — it selected from `store_order_items` and filtered on
 * an embedded `store_orders!inner`, so the planner had to reach every item row
 * before it could apply the store and date filters. `store_order_items.order_id`
 * carries a foreign key but no index (Postgres does not create one for the
 * referencing side), so that path got slower every day of the month until it
 * started timing out. This direction is covered by the
 * `store_orders (store_id, created_at)` index instead, and is the same shape
 * `getHourlySales` and `getSummaryUsers` already use.
 *
 * The loop also stops on a short page rather than only on an empty one, so it
 * no longer issues a final request with an offset past the end.
 */
async function fetchMonthOrders(
    supabase: SupabaseClient,
    tenantId: string,
    storeId: string,
    start: string,
    end: string,
): Promise<MonthOrderRow[]> {
    const pageSize = 1000;
    const all: MonthOrderRow[] = [];

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from("store_orders")
            .select("id, store_order_items(product_id, quantity)")
            .eq("tenant_id", tenantId)
            .eq("store_id", storeId)
            .gte("created_at", start)
            .lt("created_at", end)
            .order("created_at", { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        all.push(...(data as unknown as MonthOrderRow[]));
        if (data.length < pageSize) break;
    }

    return all;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sumOrderItemCups(orderItems: any[]): number {
    return orderItems?.reduce((sum: number, item: { quantity: number }) => sum + (item.quantity || 0), 0) ?? 0;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function getDailySales(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;

    // Read pre-aggregated per-day totals from daily summaries (≤31 rows)
    // instead of paginating every order for the month — same source the
    // mini chart uses, and the summary `date` is already the business date.
    const [year, monthNum] = month.split("-").map((v) => parseInt(v, 10));
    const startStr = `${month}-01`;
    const nextMonthStr =
        monthNum === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
        .from("store_daily_summaries")
        .select("date, total_cups")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .gte("date", startStr)
        .lt("date", nextMonthStr)
        .gt("total_cups", 0)
        .order("date", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({ date: row.date, cups: row.total_cups ?? 0 }));
}

export async function getTeaWaste(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;

    const [year, monthNum] = month.split("-").map((v) => parseInt(v, 10));
    const startStr = `${month}-01`;
    const nextMonthStr =
        monthNum === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

    // Business date lives on the daily summary; map its id → date for the month.
    const { data: summaries, error: summariesError } = await supabase
        .from("store_daily_summaries")
        .select("id, date")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .gte("date", startStr)
        .lt("date", nextMonthStr);

    if (summariesError) throw summariesError;

    const idToDate = new Map<string, string>();
    for (const s of summaries ?? []) idToDate.set(s.id, s.date);
    if (idToDate.size === 0) return [];

    // closing:tea photos carry a { value, unit: "L" } quantity JSONB.
    const { data: photos, error: photosError } = await supabase
        .from("store_daily_summary_photos")
        .select("daily_summary_id, quantity")
        .eq("tenant_id", tenantId)
        .eq("type", "closing:tea")
        .in("daily_summary_id", [...idToDate.keys()]);

    if (photosError) throw photosError;

    const litersByDate: Record<string, number> = {};
    for (const photo of photos ?? []) {
        const date = photo.daily_summary_id ? idToDate.get(photo.daily_summary_id) : undefined;
        if (!date) continue;
        const quantity = photo.quantity as { value?: number } | null;
        const value = typeof quantity?.value === "number" ? quantity.value : 0;
        litersByDate[date] = (litersByDate[date] ?? 0) + value;
    }

    // A 0 L reading is a real (good) result, not a missing one — keep it so the
    // chart and the per-day average both count the day. Days with no
    // closing:tea photo at all are still absent, since nothing was measured.
    return Object.entries(litersByDate)
        .map(([date, liters]) => ({ date, liters }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getHourlySales(supabase: SupabaseClient, params: HourlySalesParams) {
    const { tenantId, storeId, date } = params;
    const tz = params.tzOffset ?? Number(process.env.TIMEZONE_OFFSET ?? 7);
    const pad = String(tz).padStart(2, "0");

    const { data: orders, error } = await supabase
        .from("store_orders")
        .select(`id, created_at, store_order_items(quantity)`)
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .gte("created_at", new Date(`${date}T00:00:00+${pad}:00`).toISOString())
        .lte("created_at", new Date(`${date}T23:59:59+${pad}:00`).toISOString())
        .order("created_at", { ascending: true });

    if (error) throw error;

    const hourlyData: Record<string, number> = {};
    for (const order of orders ?? []) {
        if (!order.created_at) continue;
        const localHour = new Date(new Date(order.created_at).getTime() + tz * 3600000).getHours();
        const hourKey = `${localHour.toString().padStart(2, "0")}:00`;
        if (!hourlyData[hourKey]) hourlyData[hourKey] = 0;
        hourlyData[hourKey] += sumOrderItemCups(order.store_order_items);
    }

    const allSlots = Array.from({ length: 24 }, (_, h) => {
        const slot = `${h.toString().padStart(2, "0")}:00`;
        return { hour: slot, cups: hourlyData[slot] ?? 0 };
    });

    const first = allSlots.findIndex((d) => d.cups > 0);
    const last = allSlots.findLastIndex((d) => d.cups > 0);
    return first === -1 ? [] : allSlots.slice(Math.max(0, first - 1), Math.min(23, last + 1) + 1);
}

/**
 * Per-product quantities for the month.
 *
 * The one breakdown here that genuinely needs item-level rows — no summary
 * column carries a per-product split — so it still walks the month's orders.
 * Names come from a single follow-up read keyed on the products that actually
 * sold, rather than an embed repeated on every item row.
 */
export async function getProductSales(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;
    const tz = params.tzOffset ?? Number(process.env.TIMEZONE_OFFSET ?? 7);
    const { start, end } = monthRangeIso(month, tz);

    const orders = await fetchMonthOrders(supabase, tenantId, storeId, start, end);

    const quantityByProduct = new Map<string, number>();
    for (const order of orders) {
        for (const item of order.store_order_items ?? []) {
            if (!item.product_id) continue;
            quantityByProduct.set(
                item.product_id,
                (quantityByProduct.get(item.product_id) ?? 0) + (item.quantity || 0),
            );
        }
    }

    if (quantityByProduct.size === 0) return { data: [], totalQuantity: 0 };

    const { data: products, error } = await supabase
        .from("tenant_products")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .in("id", [...quantityByProduct.keys()]);

    if (error) throw error;

    // A product the tenant no longer owns is dropped rather than shown
    // unnamed, which is what the old `tenant_products(name)` embed did too —
    // so `totalQuantity` is summed after the filter to keep the percentages
    // adding up to 100.
    const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));
    const rows = [...quantityByProduct.entries()]
        .filter(([productId, quantity]) => quantity > 0 && nameById.has(productId))
        .map(([productId, quantity]) => ({
            productId,
            productName: nameById.get(productId)!,
            quantity,
        }));

    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

    return {
        data: rows
            .map((r) => ({
                ...r,
                percentage: totalQuantity > 0 ? Math.round((r.quantity / totalQuantity) * 1000) / 10 : 0,
            }))
            .sort((a, b) => b.quantity - a.quantity),
        totalQuantity,
    };
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Average cups per weekday, read from the daily summaries (≤31 rows).
 *
 * Order items were never needed for this: `store_daily_summaries` already
 * carries one `total_cups` per store per day, which is the same source
 * `getDailySales` reads. The summary `date` is the business date, so bucketing
 * by weekday needs no offset arithmetic either — the old version shifted every
 * order timestamp by the tenant offset and ran its range a day long, which put
 * the 1st of the next month into this month's Sunday/Monday.
 *
 * `occurrences` counts days that actually sold, matching the old behaviour of
 * only counting dates that produced an order — a day the store opened and sold
 * nothing does not drag the average down.
 */
export async function getDayOfWeekSales(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;

    const [year, monthNum] = month.split("-").map((v) => parseInt(v, 10));
    const startStr = `${month}-01`;
    const nextMonthStr =
        monthNum === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
        .from("store_daily_summaries")
        .select("date, total_cups")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .gte("date", startStr)
        .lt("date", nextMonthStr)
        .gt("total_cups", 0);

    if (error) throw error;

    const buckets = Array.from({ length: 7 }, () => ({ totalCups: 0, occurrences: 0 }));
    for (const row of data ?? []) {
        // Parsed as UTC so the weekday comes from the date string itself and
        // never drifts with the server's own zone.
        const index = new Date(`${row.date}T00:00:00Z`).getUTCDay();
        buckets[index].totalCups += row.total_cups ?? 0;
        buckets[index].occurrences += 1;
    }

    return buckets.map((b, index) => ({
        dayOfWeek: DAY_NAMES[index],
        dayIndex: index,
        averageCups: b.occurrences > 0 ? Math.round((b.totalCups / b.occurrences) * 10) / 10 : 0,
        totalCups: b.totalCups,
        occurrences: b.occurrences,
    }));
}
