import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { startOfISOWeek, endOfISOWeek, parseISO, format } from "date-fns";
import { getPayrollUserInfo } from "./payroll-user-info";
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

    // Insert only if not exists; preserve existing status on conflict
    const { data: inserted } = await supabase
        .from("payroll_periods")
        .upsert(
            { tenant_id: tenantId, start_date: startDate, end_date: endDate, status: "pending" },
            { onConflict: "tenant_id,start_date", ignoreDuplicates: true },
        )
        .select()
        .maybeSingle();

    if (inserted) return inserted as { id: string; status: string; [key: string]: unknown };

    // Row already existed — fetch it
    const { data: existing, error } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("start_date", startDate)
        .single();

    if (error || !existing) throw new Error(error?.message ?? "Failed to get payroll period");
    return existing as { id: string; status: string; [key: string]: unknown };
}

// ─── Create payroll commissions ───────────────────────────────────────────────

export interface CreatePayrollCommissionsParams {
    tenantId: string;
    storeId: string;
    dailySummaryId: string;
    date: string;
    triggeredByUserId: string;
}

export async function createPayrollCommissions(
    supabase: SupabaseClient,
    params: CreatePayrollCommissionsParams,
) {
    const { tenantId, storeId, dailySummaryId, date, triggeredByUserId } = params;

    const { count: existingCount } = await supabase
        .from("payroll_commissions")
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

            const sessionCups = (
                (orders ?? []) as Array<{ store_order_items?: Array<{ quantity: number }> }>
            ).reduce(
                (sum, order) =>
                    sum + (order.store_order_items?.reduce((s, item) => s + item.quantity, 0) ?? 0),
                0,
            );
            totalCups += sessionCups;
        }

        const info = await getPayrollUserInfo(supabase, { tenantId, userId });
        if (!info) {
            console.warn(`[payroll] No payroll_user_info for user ${userId} in tenant ${tenantId} — skipping`);
            continue;
        }

        const commissionTypeId = (info.commissionTypeId as string | null) ?? null;
        let ratePerCup = 0;
        if (commissionTypeId) {
            const { data: commissionType } = await supabase
                .from("payroll_commission_types")
                .select("rate_per_cup")
                .eq("id", commissionTypeId)
                .single();
            ratePerCup = commissionType?.rate_per_cup ?? 0;
        }
        const grossPay = totalCups * ratePerCup;

        const { data: commission, error: commissionError } = await supabase
            .from("payroll_commissions")
            .insert({
                tenant_id: tenantId,
                store_id: storeId,
                user_id: userId,
                payroll_period_id: period.id,
                daily_summary_id: dailySummaryId,
                date,
                total_cups: totalCups,
                rate_per_cup: ratePerCup,
                commission_type_id: commissionTypeId,
                gross_pay: grossPay,
            })
            .select()
            .single();

        if (commissionError) throw commissionError;
        created.push(toCamelKeys(commission));

        const log = createLogger(supabase, { tenantId, userId: triggeredByUserId, storeId });
        log("payroll_commission_updated", {
            refId: (commission as { id: string }).id,
            refTable: "payroll_commissions",
            metadata: { user_id: userId, total_cups: totalCups, rate_per_cup: ratePerCup, gross_pay: grossPay },
        });
    }

    return created;
}

// ─── List payroll commissions ─────────────────────────────────────────────────

export async function listPayrollCommissions(
    supabase: SupabaseClient,
    { tenantId, periodId, userId }: { tenantId: string; periodId?: string; userId?: string },
) {
    let query = supabase
        .from("payroll_commissions")
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

    // Don't mutate a settled payout
    if (existing && (existing as { status: string }).status === "paid") {
        return toCamelKeys(existing);
    }

    // Compute commissions total
    const { data: commissions } = await supabase
        .from("payroll_commissions")
        .select("gross_pay")
        .eq("tenant_id", tenantId)
        .eq("payroll_period_id", periodId)
        .eq("user_id", userId);

    const commissionsTotal = (commissions ?? []).reduce(
        (s, e) => s + ((e as { gross_pay: number }).gross_pay ?? 0),
        0,
    );

    // Compute claims total from approved claims in period
    const { data: claims } = await supabase
        .from("payroll_claims")
        .select("amount")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("payroll_period_id", periodId)
        .eq("status", "approved");

    const claimsTotal = (claims ?? []).reduce(
        (s, c) => s + ((c as { amount: number }).amount ?? 0),
        0,
    );

    const totalPay = commissionsTotal + claimsTotal;

    if (existing) {
        const { data, error } = await supabase
            .from("payroll_payouts")
            .update({ commissions_total: commissionsTotal, claims_total: claimsTotal, total_pay: totalPay })
            .eq("id", (existing as { id: string }).id)
            .select()
            .single();

        if (error || !data) throw new Error(error?.message ?? "Failed to update payout");
        return toCamelKeys(data);
    }

    const { data, error } = await supabase
        .from("payroll_payouts")
        .insert({
            tenant_id: tenantId,
            payroll_period_id: periodId,
            user_id: userId,
            status: "pending",
            commissions_total: commissionsTotal,
            claims_total: claimsTotal,
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

// ─── Update payout status ─────────────────────────────────────────────────────

export async function updatePayoutStatus(
    supabase: SupabaseClient,
    {
        id,
        tenantId,
        actorId,
        status,
        paymentProofUrl,
    }: {
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

    // On paid: mark approved claims for this period + user as paid
    if (status === "paid") {
        const row = data as { payroll_period_id: string; user_id: string };
        await supabase
            .from("payroll_claims")
            .update({ status: "paid" })
            .eq("tenant_id", tenantId)
            .eq("user_id", row.user_id)
            .eq("payroll_period_id", row.payroll_period_id)
            .eq("status", "approved");
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
    const [periodResult, commissionsResult, claimsResult, payoutResult] = await Promise.all([
        supabase
            .from("payroll_periods")
            .select("*")
            .eq("id", periodId)
            .eq("tenant_id", tenantId)
            .single(),
        supabase
            .from("payroll_commissions")
            .select("*, stores(name)")
            .eq("tenant_id", tenantId)
            .eq("payroll_period_id", periodId)
            .eq("user_id", userId)
            .order("date"),
        supabase
            .from("payroll_claims")
            .select("*, payroll_claim_types!left(name)")
            .eq("tenant_id", tenantId)
            .eq("payroll_period_id", periodId)
            .eq("user_id", userId)
            .order("date"),
        supabase
            .from("payroll_payouts")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("payroll_period_id", periodId)
            .eq("user_id", userId)
            .maybeSingle(),
    ]);

    if (periodResult.error || !periodResult.data) {
        throw Object.assign(new Error("Period not found"), { status: 404 });
    }

    // Flatten joined store name into each commission row
    const commissionsFlat = (commissionsResult.data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const store = row.stores as { name: string } | null;
        return { ...row, store_name: store?.name ?? null, stores: undefined };
    });
    const commissions = toCamelKeys(commissionsFlat) as Record<string, unknown>[];

    // Flatten joined claim type name into each claim row
    const claimsFlat = (claimsResult.data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimType = row.payroll_claim_types as { name: string } | null;
        return { ...row, claim_type_name: claimType?.name ?? null, payroll_claim_types: undefined };
    });
    const claims = toCamelKeys(claimsFlat) as Record<string, unknown>[];
    const payout = payoutResult.data ? toCamelKeys(payoutResult.data) : null;

    const commissionsTotal = commissions.reduce((s, e) => s + ((e.grossPay as number) ?? 0), 0);
    const claimsTotal = claims
        .filter((c) => c.status === "approved" || c.status === "paid")
        .reduce((s, c) => s + ((c.amount as number) ?? 0), 0);
    const totalPay = commissionsTotal + claimsTotal;
    const ratePerCup = commissions[0] ? ((commissions[0].ratePerCup as number) ?? 0) : 0;

    return {
        period: toCamelKeys(periodResult.data),
        payout,
        commissions,
        claims,
        commissionsTotal,
        claimsTotal,
        totalPay,
        ratePerCup,
    };
}

// ─── Update payroll commission ────────────────────────────────────────────────

export async function updatePayrollCommission(
    supabase: SupabaseClient,
    { tenantId, userId, id, status }: { tenantId: string; userId: string; id: string; status: string },
) {
    const { data, error } = await supabase
        .from("payroll_commissions")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Commission not found"), { status: 404 });

    const raw = data as { store_id: string };
    const log = createLogger(supabase, { tenantId, userId, storeId: raw.store_id });
    log("payroll_commission_updated", { refId: id, refTable: "payroll_commissions", metadata: { status } });

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
