import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { startOfISOWeek, endOfISOWeek, parseISO, format } from "date-fns";
import { getCommissionRate } from "./commission-configs";
import { createLogger } from "./activity-logs";

// ─── Week helpers ─────────────────────────────────────────────────────────────

function getISOWeekBounds(date: string): { startDate: string; endDate: string } {
    const d = parseISO(date);
    return {
        startDate: format(startOfISOWeek(d), "yyyy-MM-dd"),
        endDate: format(endOfISOWeek(d), "yyyy-MM-dd"),
    };
}

// ─── Get or create payroll period ─────────────────────────────────────────────

export async function getOrCreatePayrollPeriod(
    supabase: SupabaseClient,
    { tenantId, date }: { tenantId: string; date: string },
) {
    const { startDate, endDate } = getISOWeekBounds(date);

    const { data: existing } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .lte("start_date", date)
        .gte("end_date", date)
        .maybeSingle();

    if (existing) return existing as { id: string; [key: string]: unknown };

    const { data, error } = await supabase
        .from("payroll_periods")
        .insert({ tenant_id: tenantId, start_date: startDate, end_date: endDate, status: "pending" })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create payroll period");
    return data as { id: string; [key: string]: unknown };
}

// ─── Create payroll entries ───────────────────────────────────────────────────

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
                (sum, order) => sum + (order.store_order_items?.reduce((s, item) => s + item.quantity, 0) ?? 0),
                0,
            );
            totalCups += sessionCups;
        }

        const { rate } = await getCommissionRate(supabase, { tenantId, userId });
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

export async function listPayrollEntries(
    supabase: SupabaseClient,
    { tenantId, periodId, userId }: { tenantId: string; periodId?: string; userId?: string },
) {
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

// ─── List payouts ─────────────────────────────────────────────────────────────

export async function listPayouts(
    supabase: SupabaseClient,
    { tenantId, periodId, userId }: { tenantId: string; periodId?: string; userId?: string },
) {
    let query = supabase
        .from("payroll_payouts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (periodId) query = query.eq("payroll_period_id", periodId);
    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelKeys(data ?? []);
}

// ─── Upsert payout ────────────────────────────────────────────────────────────

export async function upsertPayout(
    supabase: SupabaseClient,
    { tenantId, periodId, userId }: { tenantId: string; periodId: string; userId: string },
) {
    const { data: existing } = await supabase
        .from("payroll_payouts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existing) return toCamelKeys(existing);

    // Fetch period to get date range
    const { data: period } = await supabase
        .from("payroll_periods")
        .select("start_date, end_date")
        .eq("id", periodId)
        .single();

    if (!period) throw Object.assign(new Error("Period not found"), { status: 404 });

    // Compute cups pay from entries
    const { data: entries } = await supabase
        .from("payroll_entries")
        .select("gross_pay")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .eq("user_id", userId);

    const cupsPayTotal = (entries ?? []).reduce((s, e) => s + ((e as { gross_pay: number }).gross_pay ?? 0), 0);

    // Compute reimbursements total from approved claims in date range
    const { data: claims } = await supabase
        .from("payroll_reimbursements")
        .select("amount")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("status", "approved")
        .gte("date", (period as { start_date: string }).start_date)
        .lte("date", (period as { end_date: string }).end_date);

    const reimbursementsTotal = (claims ?? []).reduce((s, c) => s + ((c as { amount: number }).amount ?? 0), 0);
    const totalPay = cupsPayTotal + reimbursementsTotal;

    const { data, error } = await supabase
        .from("payroll_payouts")
        .insert({
            tenant_id: tenantId,
            payroll_period_id: periodId,
            user_id: userId,
            status: "pending",
            cups_pay_total: cupsPayTotal,
            reimbursements_total: reimbursementsTotal,
            total_pay: totalPay,
        })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create payout");
    return toCamelKeys(data);
}

// ─── Get single payout ───────────────────────────────────────────────────────

export async function getPayout(
    supabase: SupabaseClient,
    { id, tenantId }: { id: string; tenantId: string },
) {
    const { data, error } = await supabase
        .from("payroll_payouts")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (error || !data) return null;
    return toCamelKeys(data) as { payrollPeriodId: string; userId: string; [key: string]: unknown };
}

// ─── Bundle reimbursements into period ───────────────────────────────────────

export async function bundleReimbursementsIntoPeriod(
    supabase: SupabaseClient,
    { tenantId, periodId, userId }: { tenantId: string; periodId: string; userId: string },
) {
    const { data: period } = await supabase
        .from("payroll_periods")
        .select("start_date, end_date")
        .eq("id", periodId)
        .single();

    if (!period) return;

    await supabase
        .from("payroll_reimbursements")
        .update({ payroll_period_id: periodId })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("status", "approved")
        .is("payroll_period_id", null)
        .gte("date", (period as { start_date: string }).start_date)
        .lte("date", (period as { end_date: string }).end_date);
}

// ─── Update payout status ─────────────────────────────────────────────────────

export async function updatePayoutStatus(
    supabase: SupabaseClient,
    { id, tenantId, actorId, status, paymentProofUrl }: {
        id: string;
        tenantId: string;
        actorId: string;
        status: "approved" | "on_hold" | "paid";
        paymentProofUrl?: string;
    },
) {
    const updates: Record<string, unknown> = { status };
    if (status === "paid") {
        updates.paid_at = new Date().toISOString();
        updates.paid_by = actorId;
        if (paymentProofUrl) updates.payment_proof_url = paymentProofUrl;
    }

    const { data, error } = await supabase
        .from("payroll_payouts")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Payout not found"), { status: 404 });

    // On paid: mark bundled reimbursements as paid
    if (status === "paid") {
        const row = data as { payroll_period_id: string; user_id: string };
        await supabase
            .from("payroll_reimbursements")
            .update({ status: "paid" })
            .eq("tenant_id", tenantId)
            .eq("user_id", row.user_id)
            .eq("payroll_period_id", row.payroll_period_id);
    }

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("payroll_payout_updated", {
        refId: id,
        refTable: "payroll_payouts",
        metadata: { status },
    });

    return toCamelKeys(data);
}

// ─── Get payslip ──────────────────────────────────────────────────────────────

export async function getPayslip(
    supabase: SupabaseClient,
    { tenantId, userId, periodId }: { tenantId: string; userId: string; periodId: string },
) {
    const [periodResult, entriesResult, payoutResult] = await Promise.all([
        supabase.from("payroll_periods").select("*").eq("id", periodId).eq("tenant_id", tenantId).single(),
        supabase.from("payroll_entries").select("*").eq("tenant_id", tenantId).eq("payroll_period_id", periodId).eq("user_id", userId).order("date"),
        supabase.from("payroll_payouts").select("*").eq("tenant_id", tenantId).eq("payroll_period_id", periodId).eq("user_id", userId).maybeSingle(),
    ]);

    if (periodResult.error || !periodResult.data) {
        throw Object.assign(new Error("Period not found"), { status: 404 });
    }

    const period = periodResult.data as { start_date: string; end_date: string };

    const reimbursementsResult = await supabase
        .from("payroll_reimbursements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("payroll_period_id", periodId)
        .order("date");

    // Also include approved claims in date range not yet bundled
    const { data: unbundledClaims } = await supabase
        .from("payroll_reimbursements")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("status", "approved")
        .is("payroll_period_id", null)
        .gte("date", period.start_date)
        .lte("date", period.end_date);

    const allReimbursements = [...(reimbursementsResult.data ?? []), ...(unbundledClaims ?? [])];
    const uniqueReimbursements = Array.from(new Map(allReimbursements.map(r => [(r as { id: string }).id, r])).values());

    const entries = toCamelKeys(entriesResult.data ?? []) as Record<string, unknown>[];
    const payout = payoutResult.data ? toCamelKeys(payoutResult.data) : null;
    const reimbursements = toCamelKeys(uniqueReimbursements) as Record<string, unknown>[];

    const cupsPayTotal = entries.reduce((s, e) => s + ((e.grossPay as number) ?? 0), 0);
    const reimbursementsTotal = reimbursements
        .filter(r => r.status === "approved" || r.status === "paid")
        .reduce((s, r) => s + ((r.amount as number) ?? 0), 0);
    const totalPay = cupsPayTotal + reimbursementsTotal;
    const ratePerCup = entries[0] ? (entries[0].ratePerCup as number) ?? 0 : 0;

    return {
        period: toCamelKeys(periodResult.data),
        payout,
        entries,
        reimbursements,
        cupsPayTotal,
        reimbursementsTotal,
        totalPay,
        ratePerCup,
    };
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
    log("payroll_entry_updated", { refId: id, refTable: "payroll_entries", metadata: { status } });

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
    log("payroll_period_updated", { refId: id, refTable: "payroll_periods", metadata: { status } });

    return toCamelKeys(data);
}
