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

function parseMonthRange(month: string) {
    const [year, monthNum] = month.split("-");
    const y = parseInt(year, 10);
    const m = parseInt(monthNum, 10);
    return {
        startDate: new Date(Date.UTC(y, m - 1, 1)),
        endDate: new Date(Date.UTC(y, m, 0, 23, 59, 59)),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllOrders(supabase: SupabaseClient, storeId: string, tenantId: string, start: string, end: string): Promise<any[]> {
    const pageSize = 1000;
    let from = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let all: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("orders")
            .select(`id, created_at, order_items(quantity)`)
            .eq("tenant_id", tenantId)
            .eq("store_id", storeId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true })
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        from += pageSize;
    }

    return all;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllOrderItems(supabase: SupabaseClient, storeId: string, tenantId: string, start: string, end: string): Promise<any[]> {
    const pageSize = 1000;
    let from = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let all: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from("order_items")
            .select(`id, quantity, product_id, products(name), order_id, orders!inner(store_id, created_at)`)
            .eq("tenant_id", tenantId)
            .eq("orders.store_id", storeId)
            .gte("orders.created_at", start)
            .lte("orders.created_at", end)
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        from += pageSize;
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
    const tz = params.tzOffset ?? Number(process.env.TIMEZONE_OFFSET ?? 7);
    const { startDate, endDate } = parseMonthRange(month);

    const orders = await fetchAllOrders(supabase, storeId, tenantId, startDate.toISOString(), endDate.toISOString());

    const dailyData: Record<string, number> = {};
    for (const order of orders) {
        if (!order.created_at) continue;
        const dateKey = new Date(new Date(order.created_at).getTime() + tz * 3600000).toISOString().split("T")[0];
        if (!dailyData[dateKey]) dailyData[dateKey] = 0;
        dailyData[dateKey] += sumOrderItemCups(order.order_items);
    }

    return Object.entries(dailyData)
        .map(([date, cups]) => ({ date, cups }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getHourlySales(supabase: SupabaseClient, params: HourlySalesParams) {
    const { tenantId, storeId, date } = params;
    const tz = params.tzOffset ?? Number(process.env.TIMEZONE_OFFSET ?? 7);
    const pad = String(tz).padStart(2, "0");

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`id, created_at, order_items(quantity)`)
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
        hourlyData[hourKey] += sumOrderItemCups(order.order_items);
    }

    const allSlots = Array.from({ length: 24 }, (_, h) => {
        const slot = `${h.toString().padStart(2, "0")}:00`;
        return { hour: slot, cups: hourlyData[slot] ?? 0 };
    });

    const first = allSlots.findIndex((d) => d.cups > 0);
    const last = allSlots.findLastIndex((d) => d.cups > 0);
    return first === -1 ? [] : allSlots.slice(Math.max(0, first - 1), Math.min(23, last + 1) + 1);
}

export async function getProductSales(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;
    const { startDate, endDate } = parseMonthRange(month);

    const items = await fetchAllOrderItems(supabase, storeId, tenantId, startDate.toISOString(), endDate.toISOString());

    const productData: Record<string, { name: string; quantity: number }> = {};
    for (const item of items) {
        if (!item.product_id || !item.products?.name) continue;
        if (!productData[item.product_id]) productData[item.product_id] = { name: item.products.name, quantity: 0 };
        productData[item.product_id].quantity += item.quantity || 0;
    }

    const totalQuantity = Object.values(productData).reduce((sum, p) => sum + p.quantity, 0);

    return {
        data: Object.entries(productData)
            .map(([productId, { name, quantity }]) => ({
                productId,
                productName: name,
                quantity,
                percentage: totalQuantity > 0 ? Math.round((quantity / totalQuantity) * 1000) / 10 : 0,
            }))
            .filter((item) => item.quantity > 0)
            .sort((a, b) => b.quantity - a.quantity),
        totalQuantity,
    };
}

export async function getDayOfWeekSales(supabase: SupabaseClient, params: MonthSalesParams) {
    const { tenantId, storeId, month } = params;
    const tz = params.tzOffset ?? 7;

    const [year, monthNum] = month.split("-");
    const y = parseInt(year, 10);
    const m = parseInt(monthNum, 10);
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 1, 16, 59, 59));

    const items = await fetchAllOrderItems(supabase, storeId, tenantId, startDate.toISOString(), endDate.toISOString());

    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayData: Record<number, { totalCups: number; dates: Set<string> }> = {};
    for (let i = 0; i < 7; i++) dayData[i] = { totalCups: 0, dates: new Set() };

    for (const item of items) {
        if (!item.orders?.created_at) continue;
        const local = new Date(new Date(item.orders.created_at).getTime() + tz * 3600000);
        dayData[local.getUTCDay()].totalCups += item.quantity || 0;
        dayData[local.getUTCDay()].dates.add(local.toISOString().split("T")[0]);
    }

    return Object.entries(dayData)
        .map(([i, d]) => {
            const index = parseInt(i, 10);
            const occurrences = d.dates.size;
            return {
                dayOfWeek: DAY_NAMES[index],
                dayIndex: index,
                averageCups: occurrences > 0 ? Math.round((d.totalCups / occurrences) * 10) / 10 : 0,
                totalCups: d.totalCups,
                occurrences,
            };
        })
        .sort((a, b) => a.dayIndex - b.dayIndex);
}
