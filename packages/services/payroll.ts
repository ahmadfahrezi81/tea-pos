import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { getCommissionRate } from "./commission-configs";
import { createLogger } from "./activity-logs";

// ─── Get or create payroll period ─────────────────────────────────────────────
// Finds an open period covering `date`, or creates a new Monday–Sunday week.

export async function getOrCreatePayrollPeriod(
    supabase: SupabaseClient,
    { tenantId, date }: { tenantId: string; date: string },
) {
    const { data: existing } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .lte("start_date", date)
        .gte("end_date", date)
        .maybeSingle();

    if (existing) return existing as { id: string; [key: string]: unknown };

    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(d);
    monday.setDate(d.getDate() + daysToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startDate = monday.toISOString().split("T")[0];
    const endDate = sunday.toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ tenant_id: tenantId, start_date: startDate, end_date: endDate })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create payroll period");
    return data as { id: string; [key: string]: unknown };
}

// ─── Create payroll entries ───────────────────────────────────────────────────
// Called when a daily_summary is closed.
// One entry per user who held a session that day. Cups counted only within their session windows.

export interface CreatePayrollEntriesParams {
    tenantId: string;
    storeId: string;
    dailySummaryId: string;
    date: string;
    triggeredByUserId: string;
}

export async function createPayrollEntries(
    supabase: SupabaseClient,
    params: CreatePayrollEntriesParams,
) {
    const { tenantId, storeId, dailySummaryId, date, triggeredByUserId } = params;

    const { count: existingCount } = await supabase
        .from("payroll_entries")
        .select("id", { count: "exact", head: true })
        .eq("daily_summary_id", dailySummaryId)
        .eq("tenant_id", tenantId);

    if ((existingCount ?? 0) > 0) return [];

    const { data: sessions, error: sessionsError } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("daily_summary_id", dailySummaryId)
        .eq("tenant_id", tenantId);

    if (sessionsError) throw sessionsError;
    if (!sessions || sessions.length === 0) return [];

    type SessionRow = { id: string; user_id: string; started_at: string; ended_at: string | null };
    const typedSessions = sessions as SessionRow[];

    const userIds = [...new Set(typedSessions.map((s) => s.user_id))];
    const period = await getOrCreatePayrollPeriod(supabase, { tenantId, date });

    const created: unknown[] = [];

    for (const userId of userIds) {
        const userSessions = typedSessions.filter((s) => s.user_id === userId);
        let totalCups = 0;

        for (const session of userSessions) {
            const endedAt = session.ended_at ?? new Date().toISOString();

            const { data: orders } = await supabase
                .from("store_orders")
                .select("id, store_order_items(quantity)")
                .eq("user_id", userId)
                .eq("store_id", storeId)
                .eq("tenant_id", tenantId)
                .gte("created_at", session.started_at)
                .lt("created_at", endedAt);

            const sessionCups = ((orders ?? []) as Array<{ store_order_items?: Array<{ quantity: number }> }>).reduce(
                (sum, order) =>
                    sum + (order.store_order_items?.reduce((s, item) => s + item.quantity, 0) ?? 0),
                0,
            );
            totalCups += sessionCups;
        }

        const { rate } = await getCommissionRate(supabase, { tenantId, role: "USER" });
        const grossPay = totalCups * rate;

        const { data: entry, error: entryError } = await supabase
            .from("payroll_entries")
            .insert({
                tenant_id: tenantId,
                store_id: storeId,
                user_id: userId,
                payroll_period_id: period.id,
                daily_summary_id: dailySummaryId,
                date,
                total_cups: totalCups,
                rate_per_cup: rate,
                gross_pay: grossPay,
            })
            .select()
            .single();

        if (entryError) throw entryError;
        created.push(toCamelKeys(entry));

        const log = createLogger(supabase, { tenantId, userId: triggeredByUserId, storeId });
        log("payroll_entry_updated", {
            refId: (entry as { id: string }).id,
            refTable: "payroll_entries",
            metadata: { user_id: userId, total_cups: totalCups, rate_per_cup: rate, gross_pay: grossPay },
        });
    }

    return created;
}

// ─── List payroll entries ─────────────────────────────────────────────────────

export interface ListPayrollEntriesParams {
    tenantId: string;
    periodId?: string;
    userId?: string;
}

export async function listPayrollEntries(
    supabase: SupabaseClient,
    params: ListPayrollEntriesParams,
) {
    const { tenantId, periodId, userId } = params;

    let query = supabase
        .from("payroll_entries")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false });

    if (periodId) query = query.eq("payroll_period_id", periodId);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) throw error;

    return toCamelKeys(data ?? []);
}

// ─── List payroll periods ─────────────────────────────────────────────────────

export async function listPayrollPeriods(
    supabase: SupabaseClient,
    { tenantId, status }: { tenantId: string; status?: string },
) {
    let query = supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return toCamelKeys(data ?? []);
}

// ─── Update payroll entry ─────────────────────────────────────────────────────

export async function updatePayrollEntry(
    supabase: SupabaseClient,
    { tenantId, userId, id, status }: { tenantId: string; userId: string; id: string; status: string },
) {
    const { data, error } = await supabase
        .from("payroll_entries")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Entry not found"), { status: 404 });

    const raw = data as { store_id: string };
    const log = createLogger(supabase, { tenantId, userId, storeId: raw.store_id });
    log("payroll_entry_updated", {
        refId: id,
        refTable: "payroll_entries",
        metadata: { status },
    });

    return toCamelKeys(data);
}

// ─── Update payroll period ────────────────────────────────────────────────────

export async function updatePayrollPeriod(
    supabase: SupabaseClient,
    { tenantId, userId, id, status }: { tenantId: string; userId: string; id: string; status: string },
) {
    const { data, error } = await supabase
        .from("payroll_periods")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Period not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId });
    log("payroll_period_updated", {
        refId: id,
        refTable: "payroll_periods",
        metadata: { status },
    });

    return toCamelKeys(data);
}
