import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";
import { fetchSessionUsersForSummaries } from "./sessions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderRow {
    id: string;
    total_amount: number;
    created_at: string;
    store_order_items?: Array<{ quantity: number; total_price: number; tenant_products?: Array<{ name: string }> | { name: string } | null }>;
}

interface SummaryRow {
    id: string;
    date: string;
    store_id: string;
    opening_balance: number;
    total_sales: number;
    total_orders: number;
    total_cups: number;
    total_expenses: number;
    expected_cash: number;
    closed_at: string | null;
    [key: string]: unknown;
}

const DEFAULT_TZ = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);

// ─── Internal helpers ─────────────────────────────────────────────────────────


export async function seedTotalsFromOrders(
    supabase: SupabaseClient,
    storeId: string,
    tenantId: string,
    date: string,
) {
    const orders = await fetchOrdersForDate(supabase, storeId, tenantId, date);
    return aggregateOrders(orders);
}

async function fetchOrdersForDate(
    supabase: SupabaseClient,
    storeId: string,
    tenantId: string,
    date: string,
    tz = DEFAULT_TZ,
): Promise<OrderRow[]> {
    const startUtc = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - tz * 3600000).toISOString();
    const endUtc = new Date(new Date(`${date}T23:59:59.999Z`).getTime() - tz * 3600000).toISOString();

    const { data, error } = await supabase
        .from("store_orders")
        .select(`id, total_amount, created_at, store_order_items(quantity, total_price, tenant_products(name))`)
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("created_at", startUtc)
        .lte("created_at", endUtc)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as OrderRow[];
}

function aggregateOrders(orders: OrderRow[]) {
    return orders.reduce(
        (acc, order) => ({
            totalSales: acc.totalSales + order.total_amount,
            totalOrders: acc.totalOrders + 1,
            totalCups: acc.totalCups + (order.store_order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0),
        }),
        { totalSales: 0, totalOrders: 0, totalCups: 0 },
    );
}

// ─── List summaries ───────────────────────────────────────────────────────────

export interface ListSummariesParams {
    tenantId: string;
    storeId: string;
    month: string;
    tzOffset?: number;
}

export async function listSummaries(supabase: SupabaseClient, params: ListSummariesParams) {
    const { tenantId, storeId, month, tzOffset = DEFAULT_TZ } = params;

    const startDate = `${month}-01`;
    const endDateObj = new Date(`${month}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split("T")[0];

    const { data: summaries, error: summariesError } = await supabase
        .from("store_daily_summaries")
        .select(
            `*, stores(name),
            opened_by_user:users!daily_summaries_opened_by_fkey(full_name),
            closed_by_user:users!daily_summaries_closed_by_fkey(full_name)`,
        )
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

    if (summariesError) throw summariesError;

    const summaryList = (summaries ?? []) as SummaryRow[];
    const summaryIds = summaryList.map((s) => s.id);
    const sessionsBySummaryId = summaryIds.length > 0
        ? await fetchSessionUsersForSummaries(supabase, { tenantId, summaryIds })
        : {};
    const expensesBySummaryId: Record<string, Array<{ daily_summary_id: string; amount: number; [key: string]: unknown }>> = {};
    const expensesByDate: Record<string, unknown[]> = {};
    const photoCountBySummaryId: Record<string, number> = {};

    if (summaryIds.length > 0) {
        const { data: expenses, error: expensesError } = await supabase
            .from("store_expenses")
            .select("*")
            .in("daily_summary_id", summaryIds)
            .eq("tenant_id", tenantId);

        if (expensesError) throw expensesError;

        (expenses ?? []).forEach((expense) => {
            if (!expensesBySummaryId[expense.daily_summary_id]) expensesBySummaryId[expense.daily_summary_id] = [];
            expensesBySummaryId[expense.daily_summary_id].push(expense);

            const summary = summaryList.find((s) => s.id === expense.daily_summary_id);
            if (summary) {
                if (!expensesByDate[summary.date]) expensesByDate[summary.date] = [];
                expensesByDate[summary.date].push(expense);
            }
        });

        const { data: photos, error: photosError } = await supabase
            .from("store_daily_summary_photos")
            .select("daily_summary_id")
            .in("daily_summary_id", summaryIds)
            .eq("tenant_id", tenantId);

        if (photosError) throw photosError;

        (photos ?? []).forEach((p) => {
            photoCountBySummaryId[p.daily_summary_id] = (photoCountBySummaryId[p.daily_summary_id] ?? 0) + 1;
        });
    }

    const finalSummaries = summaryList.map((s) => ({
        ...s,
        expenses: expensesBySummaryId[s.id] ?? [],
        sessions: sessionsBySummaryId[s.id] ?? [],
        photo_count: photoCountBySummaryId[s.id] ?? 0,
    }));
    const monthlyTotals = summaryList.reduce(
        (acc, s) => ({
            totalSales: acc.totalSales + (s.total_sales ?? 0),
            totalOrders: acc.totalOrders + (s.total_orders ?? 0),
            totalCups: acc.totalCups + (s.total_cups ?? 0),
            totalExpenses: acc.totalExpenses + (s.total_expenses ?? 0),
        }),
        { totalSales: 0, totalOrders: 0, totalCups: 0, totalExpenses: 0 },
    );

    return {
        summaries: toCamelKeys(finalSummaries),
        expensesByDate: toCamelKeys(expensesByDate),
        monthlyTotals,
    };
}

// ─── Get single summary ───────────────────────────────────────────────────────

export async function getSummaryById(
    supabase: SupabaseClient,
    { tenantId, summaryId }: { tenantId: string; summaryId: string },
) {
    const { data, error } = await supabase
        .from("store_daily_summaries")
        .select(
            `*, stores(name),
            opened_by_user:users!daily_summaries_opened_by_fkey(full_name),
            closed_by_user:users!daily_summaries_closed_by_fkey(full_name)`,
        )
        .eq("id", summaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) throw new Error("Summary not found");

    return toCamelKeys(data) as ReturnType<typeof toCamelKeys>;
}

// ─── Create summary ───────────────────────────────────────────────────────────

export interface CreateSummaryParams {
    tenantId: string;
    storeId: string;
    openedBy: string;
    date: string;
    openingBalance?: number;
    openingCashBreakdown?: unknown;
}

export async function createSummary(supabase: SupabaseClient, params: CreateSummaryParams) {
    const { tenantId, storeId, openedBy, date, openingBalance, openingCashBreakdown } = params;

    const { data: store, error: storeError } = await supabase
        .from("stores")
        .select("id, tenant_id")
        .eq("id", storeId)
        .eq("tenant_id", tenantId)
        .single();

    if (storeError || !store) throw new Error("Store not found or access denied");

    const { count, error: existsError } = await supabase
        .from("store_daily_summaries")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("date", date)
        .eq("tenant_id", tenantId);

    if (existsError) throw existsError;
    if ((count ?? 0) > 0) throw Object.assign(new Error("Daily summary already exists for this date"), { status: 409 });

    const createStartUtc = new Date(new Date(`${date}T00:00:00.000Z`).getTime() - DEFAULT_TZ * 3600000).toISOString();
    const createEndUtc = new Date(new Date(`${date}T23:59:59.999Z`).getTime() - DEFAULT_TZ * 3600000).toISOString();
    const { data: existingOrders } = await supabase
        .from("store_orders")
        .select("total_amount, store_order_items(quantity)")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .gte("created_at", createStartUtc)
        .lte("created_at", createEndUtc);

    const typedOrders = (existingOrders ?? []) as Array<{
        total_amount: number;
        store_order_items?: Array<{ quantity: number }>;
    }>;
    const totalSales = typedOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalOrders = typedOrders.length;
    const totalCups = typedOrders.reduce((sum, o) => sum + (o.store_order_items?.reduce((s, i) => s + i.quantity, 0) ?? 0), 0);
    const opening = openingBalance ?? 0;

    const { data: summaryData, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .insert({
            store_id: storeId,
            tenant_id: store.tenant_id,
            opened_by: openedBy,
            date,
            opening_balance: opening,
            opening_cash_breakdown: openingCashBreakdown ?? null,
            total_sales: totalSales,
            total_orders: totalOrders,
            total_cups: totalCups,
            total_expenses: 0,
            expected_cash: opening + totalSales,
        })
        .select()
        .single();

    if (summaryError || !summaryData) throw new Error(summaryError?.message ?? "Daily summary insert failed");

    const log = createLogger(supabase, { tenantId: store.tenant_id, userId: openedBy, storeId });
    log("store_opened", {
        refId: (summaryData as { id: string }).id,
        refTable: "store_daily_summaries",
        metadata: { date, opening_balance: opening },
    });

    return toCamelKeys(summaryData);
}

// ─── Update summary ───────────────────────────────────────────────────────────

export interface UpdateSummaryParams {
    tenantId: string;
    userId: string;
    id: string;
    openingBalance?: number;
    openingCashBreakdown?: unknown;
    actualCash?: number | null;
    closingCashBreakdown?: unknown;
    notes?: string | null;
    closedAt?: string | null;
}

export async function updateSummary(supabase: SupabaseClient, params: UpdateSummaryParams) {
    const { tenantId, userId, id, openingBalance, openingCashBreakdown, actualCash, closingCashBreakdown, notes, closedAt } = params;

    const { data: current, error: fetchError } = await supabase
        .from("store_daily_summaries")
        .select("expected_cash, total_sales, total_expenses, total_orders, total_cups, closed_at")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (fetchError || !current) throw new Error("Daily summary not found");

    const updates: Record<string, unknown> = {};
    if (openingBalance !== undefined) updates.opening_balance = openingBalance;
    if (openingCashBreakdown !== undefined) updates.opening_cash_breakdown = openingCashBreakdown;
    if (actualCash !== undefined) updates.actual_cash = actualCash;
    if (closingCashBreakdown !== undefined) updates.closing_cash_breakdown = closingCashBreakdown;
    if (notes !== undefined) updates.notes = notes;
    if (closedAt !== undefined) updates.closed_at = closedAt;

    if (actualCash !== null && actualCash !== undefined) {
        updates.variance = actualCash - current.expected_cash;
    }

    if (openingBalance !== undefined) {
        updates.expected_cash = openingBalance + current.total_sales - current.total_expenses;
    }

    // Record who closed the summary
    if (closedAt && !current.closed_at) {
        updates.closed_by = userId;
    }

    // Lock in final totals on close
    if (closedAt && !current.closed_at) {
        const { data: summaryRow } = await supabase
            .from("store_daily_summaries")
            .select("date, store_id, opening_balance")
            .eq("id", id)
            .eq("tenant_id", tenantId)
            .single();

        if (summaryRow) {
            const { date, store_id, opening_balance } = summaryRow as {
                date: string;
                store_id: string;
                opening_balance: number;
            };

            const liveOrders = await fetchOrdersForDate(supabase, store_id, tenantId, date);
            const { totalSales, totalOrders, totalCups } = aggregateOrders(liveOrders);

            const { data: expenseRows } = await supabase
                .from("store_expenses")
                .select("amount")
                .eq("daily_summary_id", id)
                .eq("tenant_id", tenantId);

            const totalExpenses = ((expenseRows ?? []) as Array<{ amount: number }>).reduce((sum, e) => sum + e.amount, 0);
            const finalExpectedCash = opening_balance + totalSales - totalExpenses;

            updates.total_sales = totalSales;
            updates.total_orders = totalOrders;
            updates.total_cups = totalCups;
            updates.total_expenses = totalExpenses;
            updates.expected_cash = finalExpectedCash;

            if (actualCash !== null && actualCash !== undefined) {
                updates.variance = actualCash - finalExpectedCash;
            }
        }
    }

    if (Object.keys(updates).length === 0) throw new Error("No fields to update");

    const { data: summaryData, error: updateError } = await supabase
        .from("store_daily_summaries")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (updateError || !summaryData) throw new Error(updateError?.message ?? "Daily summary not found");

    const raw = summaryData as { store_id: string; total_sales: number; variance: number | null };
    const log = createLogger(supabase, { tenantId, userId, storeId: raw.store_id });

    if (closedAt && !current.closed_at) {
        log("store_closed", {
            refId: id,
            refTable: "store_daily_summaries",
            metadata: { total_sales: raw.total_sales, variance: raw.variance },
        });
    } else if (openingBalance !== undefined) {
        log("opening_balance_updated", {
            refId: id,
            refTable: "store_daily_summaries",
            metadata: { opening_balance: openingBalance },
        });
    }

    return toCamelKeys(summaryData);
}

// ─── Breakdown ────────────────────────────────────────────────────────────────

export async function getSummaryBreakdown(
    supabase: SupabaseClient,
    { tenantId, summaryId }: { tenantId: string; summaryId: string },
) {
    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("store_id, date")
        .eq("id", summaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (summaryError || !summary) throw new Error("Summary not found");

    const breakdownStartUtc = new Date(new Date(`${summary.date}T00:00:00.000Z`).getTime() - DEFAULT_TZ * 3600000).toISOString();
    const breakdownEndUtc = new Date(new Date(`${summary.date}T23:59:59.999Z`).getTime() - DEFAULT_TZ * 3600000).toISOString();
    const { data: orders, error: ordersError } = await supabase
        .from("store_orders")
        .select(`id, total_amount, store_order_items(quantity, total_price, tenant_products(name))`)
        .eq("store_id", summary.store_id)
        .eq("tenant_id", tenantId)
        .gte("created_at", breakdownStartUtc)
        .lte("created_at", breakdownEndUtc);

    if (ordersError) throw ordersError;

    const breakdown: Record<string, { quantity: number; revenue: number }> = {};
    (orders ?? []).forEach((order) => {
        order.store_order_items?.forEach((item: { tenant_products: Array<{ name: string }> | { name: string } | null; quantity: number; total_price: number }) => {
            const prod = item.tenant_products;
            const name = (Array.isArray(prod) ? prod[0]?.name : prod?.name) ?? "Unknown Product";
            if (!breakdown[name]) breakdown[name] = { quantity: 0, revenue: 0 };
            breakdown[name].quantity += item.quantity;
            breakdown[name].revenue += item.total_price;
        });
    });

    return { breakdown };
}

// ─── Photos ───────────────────────────────────────────────────────────────────

const PHOTO_BUCKET = "daily-photos";
const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/jpg", "image/heic", "image/heif", "image/png"];
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024;

export interface ListSummaryPhotosParams {
    tenantId: string;
    dailySummaryId?: string;
    expenseId?: string;
    type?: string;
}

export async function listSummaryPhotos(supabase: SupabaseClient, params: ListSummaryPhotosParams) {
    const { tenantId, dailySummaryId, expenseId, type } = params;

    let query = supabase
        .from("store_daily_summary_photos")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

    if (dailySummaryId) query = query.eq("daily_summary_id", dailySummaryId);
    if (expenseId) query = query.eq("expense_id", expenseId);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) throw error;

    const photosWithUrls = await Promise.all(
        ((data ?? []) as Array<{ url: string; [key: string]: unknown }>).map(async (photo) => {
            const storagePath = photo.url.split(`/${PHOTO_BUCKET}/`)[1];
            if (!storagePath) return photo;
            const { data: signedData } = await supabase.storage
                .from(PHOTO_BUCKET)
                .createSignedUrl(storagePath, 60 * 60);
            return { ...photo, url: signedData?.signedUrl ?? photo.url };
        }),
    );

    return toCamelKeys(photosWithUrls);
}

export interface UploadSummaryPhotoParams {
    tenantId: string;
    userId: string;
    dailySummaryId: string;
    storeId: string;
    type: string;
    fileBuffer: ArrayBuffer;
    fileType: string;
    expenseId?: string | null;
    quantity?: unknown;
}

export function validatePhotoFile(file: File): string | null {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return "Invalid file type. Only WebP, JPEG, HEIC and PNG are allowed.";
    if (file.size > MAX_FILE_SIZE_BYTES) return "File too large. Maximum size is 1MB.";
    return null;
}

export async function uploadSummaryPhoto(supabase: SupabaseClient, params: UploadSummaryPhotoParams) {
    const { tenantId, userId, dailySummaryId, storeId, type, fileBuffer, fileType, expenseId, quantity } = params;

    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("id, date, store_id")
        .eq("id", dailySummaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (summaryError || !summary) throw new Error("Daily summary not found or access denied");

    const ext = fileType === "image/webp" ? "webp" : "jpg";
    const storagePath = `${tenantId}/${summary.store_id}/${summary.date}/${type}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, fileBuffer, { contentType: fileType, upsert: false });

    if (uploadError) throw new Error("Failed to upload photo");

    const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(storagePath);

    const { data: photoData, error: insertError } = await supabase
        .from("store_daily_summary_photos")
        .insert({
            daily_summary_id: dailySummaryId,
            expense_id: expenseId ?? null,
            store_id: storeId,
            tenant_id: tenantId,
            type,
            url: urlData.publicUrl,
            quantity: quantity ?? null,
        })
        .select()
        .single();

    if (insertError || !photoData) {
        await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
        throw new Error("Failed to save photo record");
    }

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("summary_photo_uploaded", {
        refId: (photoData as { id: string }).id,
        refTable: "store_daily_summary_photos",
        metadata: { photo_url: urlData.publicUrl, slot: type, quantity: quantity ?? null },
    });

    return toCamelKeys(photoData);
}

export async function updateSummaryPhoto(
    supabase: SupabaseClient,
    { tenantId, userId, id, quantity }: { tenantId: string; userId: string; id: string; quantity?: unknown },
) {
    const { data: photo, error: fetchError } = await supabase
        .from("store_daily_summary_photos")
        .select("id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (fetchError || !photo) throw new Error("Photo not found or access denied");

    const { data: updated, error: updateError } = await supabase
        .from("store_daily_summary_photos")
        .update({ quantity: quantity ?? null })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (updateError || !updated) throw new Error("Failed to update photo");

    const raw = updated as { id: string; store_id: string; type: string };
    createLogger(supabase, { tenantId, userId, storeId: raw.store_id })("summary_photo_updated", {
        refId: raw.id,
        refTable: "store_daily_summary_photos",
        metadata: { slot: raw.type, quantity: quantity ?? null },
    });

    return toCamelKeys(updated);
}

export async function deleteSummaryPhoto(
    supabase: SupabaseClient,
    { tenantId, userId, id }: { tenantId: string; userId: string; id: string },
) {
    const { data: photo, error: fetchError } = await supabase
        .from("store_daily_summary_photos")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (fetchError || !photo) throw new Error("Photo not found");

    const storagePath = (photo.url as string).split(`/${PHOTO_BUCKET}/`)[1];
    if (storagePath) {
        await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    }

    const { error: deleteError } = await supabase
        .from("store_daily_summary_photos")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId);

    if (deleteError) throw new Error(deleteError.message);

    const raw = photo as { store_id: string; url: string; type: string };
    createLogger(supabase, { tenantId, userId, storeId: raw.store_id })("summary_photo_deleted", {
        refId: id,
        refTable: "store_daily_summary_photos",
        metadata: { photo_url: raw.url, slot: raw.type },
    });

    return toCamelKeys(photo);
}

export async function getSummaryPhotoCount(
    supabase: SupabaseClient,
    { tenantId, dailySummaryId }: { tenantId: string; dailySummaryId: string },
) {
    const { count, error } = await supabase
        .from("store_daily_summary_photos")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("daily_summary_id", dailySummaryId);

    if (error) throw error;
    return count ?? 0;
}
