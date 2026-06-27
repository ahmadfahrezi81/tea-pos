import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { getPayWindowBounds } from "@tea-pos/utils/week";
import { getPayrollUserInfo } from "./payroll-user-info";
import { createLogger } from "./activity-logs";

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

    const created: unknown[] = [];

    for (const userId of userIds) {
        const userSessions = typedSessions.filter((s) => s.user_id === userId);
        let totalCups = 0;
        let totalOrders = 0;

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

            const sessionOrders = (orders ?? []) as Array<{ store_order_items?: Array<{ quantity: number }> }>;
            const sessionCups = sessionOrders.reduce(
                (sum, order) =>
                    sum + (order.store_order_items?.reduce((s, item) => s + item.quantity, 0) ?? 0),
                0,
            );
            totalCups += sessionCups;
            totalOrders += sessionOrders.length;
        }

        const info = await getPayrollUserInfo(supabase, { tenantId, userId });
        if (!info) {
            console.warn(`[payroll] No payroll_user_info for user ${userId} in tenant ${tenantId} — skipping`);
            continue;
        }

        const commissionConfigId = (info.commissionConfigId as string | null) ?? null;
        const ratePerCup = (info.ratePerCup as number | null) ?? 0;
        const totalCommission = totalCups * ratePerCup;

        const { data: commission, error: commissionError } = await supabase
            .from("payroll_commissions")
            .insert({
                tenant_id: tenantId,
                store_id: storeId,
                user_id: userId,
                daily_summary_id: dailySummaryId,
                date,
                total_cups: totalCups,
                total_orders: totalOrders,
                rate_per_cup: ratePerCup,
                commission_config_id: commissionConfigId,
                total_commission: totalCommission,
            })
            .select()
            .single();

        if (commissionError) throw commissionError;
        created.push(toCamelKeys(commission));

        const log = createLogger(supabase, { tenantId, userId: triggeredByUserId, storeId });
        log("payroll_commission_updated", {
            refId: (commission as { id: string }).id,
            refTable: "payroll_commissions",
            metadata: { user_id: userId, total_cups: totalCups, total_orders: totalOrders, rate_per_cup: ratePerCup, total_commission: totalCommission },
        });

        // Auto-upsert payout and stamp payout_id on the commission
        const frequency = (info.payFrequency as string | null) ?? "bi_weekly";
        const { startDate, endDate } = getPayWindowBounds(date, frequency);
        const payout = await upsertPayout(supabase, { tenantId, userId, startDate, endDate }).catch((err) => {
            console.warn("[payroll] upsertPayout failed after commission create:", err);
            return null;
        });
        if (payout) {
            await supabase
                .from("payroll_commissions")
                .update({ payout_id: (payout as { id: string }).id })
                .eq("id", (commission as { id: string }).id)
                .then(null, () => {});
        }
    }

    return created;
}

// ─── List payroll commissions ─────────────────────────────────────────────────

export async function listPayrollCommissions(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        startDate,
        endDate,
    }: { tenantId: string; userId?: string; startDate?: string; endDate?: string },
) {
    let query = supabase
        .from("payroll_commissions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("date", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;
    if (error) throw error;
    return toCamelKeys(data ?? []);
}

// ─── List payouts ─────────────────────────────────────────────────────────────

export async function listPayouts(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        startDate,
        endDate,
    }: { tenantId: string; userId?: string; startDate?: string; endDate?: string },
) {
    let query = supabase
        .from("payroll_payouts")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("start_date", { ascending: false });

    if (userId) query = query.eq("user_id", userId);
    if (startDate) query = query.gte("start_date", startDate);
    if (endDate) query = query.lte("end_date", endDate);

    const { data, error } = await query;
    if (error) throw error;

    const payouts = data ?? [];
    if (payouts.length === 0) return [];

    const payoutIds = payouts.map((p) => (p as { id: string }).id);

    const [{ data: commissions }, { data: claims }] = await Promise.all([
        supabase
            .from("payroll_commissions")
            .select("payout_id, total_commission, total_cups, total_orders")
            .in("payout_id", payoutIds)
            .eq("status", "approved"),
        supabase
            .from("payroll_claims")
            .select("payout_id, amount")
            .in("payout_id", payoutIds)
            .eq("status", "approved"),
    ]);

    const commissionsByPayout = (commissions ?? []).reduce<Record<string, { commissionsTotal: number; totalCups: number; totalOrders: number }>>((acc, c) => {
        const id = (c as { payout_id: string }).payout_id;
        if (!acc[id]) acc[id] = { commissionsTotal: 0, totalCups: 0, totalOrders: 0 };
        acc[id].commissionsTotal += (c as { total_commission: number }).total_commission ?? 0;
        acc[id].totalCups += (c as { total_cups: number }).total_cups ?? 0;
        acc[id].totalOrders += (c as { total_orders: number }).total_orders ?? 0;
        return acc;
    }, {});

    const claimsByPayout = (claims ?? []).reduce<Record<string, { total: number; count: number }>>((acc, c) => {
        const id = (c as { payout_id: string }).payout_id;
        if (!acc[id]) acc[id] = { total: 0, count: 0 };
        acc[id].total += (c as { amount: number }).amount ?? 0;
        acc[id].count += 1;
        return acc;
    }, {});

    const merged = payouts.map((p) => {
        const id = (p as { id: string }).id;
        const comm = commissionsByPayout[id] ?? { commissionsTotal: 0, totalCups: 0, totalOrders: 0 };
        const claimsEntry = claimsByPayout[id] ?? { total: 0, count: 0 };
        return {
            ...p,
            commissions_total: comm.commissionsTotal,
            claims_total: claimsEntry.total,
            total_pay: comm.commissionsTotal + claimsEntry.total,
            total_cups: comm.totalCups,
            total_orders: comm.totalOrders,
            total_claims: claimsEntry.count,
        };
    });

    return toCamelKeys(merged);
}

// ─── Upsert payout ────────────────────────────────────────────────────────────

export async function upsertPayout(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        startDate,
        endDate,
    }: { tenantId: string; userId: string; startDate: string; endDate: string },
) {
    const { data: existing } = await supabase
        .from("payroll_payouts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("start_date", startDate)
        .maybeSingle();

    if (existing && (existing as { status: string }).status === "paid") {
        return toCamelKeys(existing);
    }

    const { data: commissions } = await supabase
        .from("payroll_commissions")
        .select("total_commission, total_cups, total_orders")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .eq("status", "approved");

    const commissionsTotal = (commissions ?? []).reduce(
        (s, e) => s + ((e as { total_commission: number }).total_commission ?? 0),
        0,
    );
    const totalCups = (commissions ?? []).reduce(
        (s, e) => s + ((e as { total_cups: number }).total_cups ?? 0),
        0,
    );
    const totalOrders = (commissions ?? []).reduce(
        (s, e) => s + ((e as { total_orders: number }).total_orders ?? 0),
        0,
    );

    const { data: claims } = await supabase
        .from("payroll_claims")
        .select("amount")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .eq("status", "approved");

    const claimsTotal = (claims ?? []).reduce(
        (s, c) => s + ((c as { amount: number }).amount ?? 0),
        0,
    );

    const totalPay = commissionsTotal + claimsTotal;

    const { data, error } = await supabase
        .from("payroll_payouts")
        .upsert(
            {
                tenant_id: tenantId,
                user_id: userId,
                start_date: startDate,
                end_date: endDate,
                commissions_total: commissionsTotal,
                claims_total: claimsTotal,
                total_pay: totalPay,
                total_cups: totalCups,
                total_orders: totalOrders,
            },
            { onConflict: "tenant_id,user_id,start_date" },
        )
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to upsert payout");

    // Stamp payout_id on any unassigned commissions/claims within this window
    const payoutId = (data as { id: string }).id;
    await Promise.all([
        supabase
            .from("payroll_commissions")
            .update({ payout_id: payoutId })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
            .is("payout_id", null),
        supabase
            .from("payroll_claims")
            .update({ payout_id: payoutId })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .gte("date", startDate)
            .lte("date", endDate)
            .is("payout_id", null),
    ]).catch((err) => console.warn("[payroll] payout_id backfill failed:", err));

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
    return toCamelKeys(data) as { userId: string; startDate: string; endDate: string; [key: string]: unknown };
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
        status: "paid";
        paymentProofUrl?: string;
    },
) {
    const { data: payout, error: payoutError } = await supabase
        .from("payroll_payouts")
        .select("id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (payoutError || !payout) throw Object.assign(new Error(payoutError?.message ?? "Payout not found"), { status: 404 });

    const [{ count: pendingCommissions }, { count: pendingClaims }] = await Promise.all([
        supabase
            .from("payroll_commissions")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("payout_id", id)
            .eq("status", "pending"),
        supabase
            .from("payroll_claims")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("payout_id", id)
            .eq("status", "pending"),
    ]);

    if ((pendingCommissions ?? 0) > 0 || (pendingClaims ?? 0) > 0) {
        throw Object.assign(new Error("Cannot mark paid while items are still pending review"), { status: 422 });
    }

    const updates: Record<string, unknown> = {
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: actorId,
    };
    if (paymentProofUrl) updates.payment_proof_url = paymentProofUrl;

    const { data, error } = await supabase
        .from("payroll_payouts")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Payout not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("payroll_payout_updated", { refId: id, refTable: "payroll_payouts", metadata: { status } });

    return toCamelKeys(data);
}

// ─── Get payslip ──────────────────────────────────────────────────────────────

export async function getPayslip(
    supabase: SupabaseClient,
    { tenantId, userId, payoutId }: { tenantId: string; userId: string; payoutId: string },
) {
    const { data: payoutRow, error: payoutError } = await supabase
        .from("payroll_payouts")
        .select("*, paid_by_user:users!payroll_payouts_paid_by_fkey(full_name)")
        .eq("id", payoutId)
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .single();

    if (payoutError || !payoutRow) {
        throw Object.assign(new Error("Payout not found"), { status: 404 });
    }

    const payoutData = payoutRow as Record<string, unknown>;
    const paidByName = (payoutData.paid_by_user as { full_name: string } | null)?.full_name ?? null;
    const payout = toCamelKeys({ ...payoutData, paid_by_user: undefined }) as { startDate: string; endDate: string; [key: string]: unknown };

    const [commissionsResult, claimsResult] = await Promise.all([
        supabase
            .from("payroll_commissions")
            .select("*, stores(name)")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("payout_id", payoutId)
            .order("date"),
        supabase
            .from("payroll_claims")
            .select("*, payroll_claim_configs!left(name, auto_threshold_hours)")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("payout_id", payoutId)
            .order("date"),
    ]);

    const commissionsFlat = (commissionsResult.data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const store = row.stores as { name: string } | null;
        return { ...row, store_name: store?.name ?? null, stores: undefined };
    });
    const commissions = toCamelKeys(commissionsFlat) as Record<string, unknown>[];

    const claimsFlat = (claimsResult.data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimType = row.payroll_claim_configs as { name: string; auto_threshold_hours: number | null } | null;
        return {
            ...row,
            claim_type_name: claimType?.name ?? null,
            auto_threshold_hours: claimType?.auto_threshold_hours ?? null,
            payroll_claim_configs: undefined,
        };
    });
    const claims = toCamelKeys(claimsFlat) as Record<string, unknown>[];

    const commissionsTotal = commissions
        .filter((e) => e.status !== "rejected")
        .reduce((s, e) => s + ((e.totalCommission as number) ?? 0), 0);
    const claimsTotal = claims
        .filter((c) => c.status !== "rejected")
        .reduce((s, c) => s + ((c.amount as number) ?? 0), 0);
    const totalPay = commissionsTotal + claimsTotal;
    const ratePerCup = commissions[0] ? ((commissions[0].ratePerCup as number) ?? 0) : 0;
    const totalOrders = commissions.reduce((s, e) => s + ((e.totalOrders as number) ?? 0), 0);

    return { payout, commissions, claims, commissionsTotal, claimsTotal, totalPay, ratePerCup, totalOrders, paidByName };
}

// ─── Update payroll commission ────────────────────────────────────────────────

export async function updatePayrollCommission(
    supabase: SupabaseClient,
    {
        tenantId,
        userId,
        id,
        status,
    }: { tenantId: string; userId: string; id: string; status: "pending" | "approved" | "rejected" },
) {
    const { data: commission, error: commissionError } = await supabase
        .from("payroll_commissions")
        .select("date, user_id, store_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (commissionError || !commission) {
        throw Object.assign(new Error(commissionError?.message ?? "Commission not found"), { status: 404 });
    }

    const row = commission as { date: string; user_id: string; store_id: string };
    const payoutRow = await assertPayoutNotPaid(supabase, { tenantId, userId: row.user_id, date: row.date });

    const { data, error } = await supabase
        .from("payroll_commissions")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Commission not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId, storeId: row.store_id });
    log("payroll_commission_updated", { refId: id, refTable: "payroll_commissions", metadata: { status } });

    if (payoutRow) {
        upsertPayout(supabase, {
            tenantId,
            userId: row.user_id,
            startDate: payoutRow.startDate,
            endDate: payoutRow.endDate,
        }).catch((err) => console.warn("[payroll] upsertPayout failed after commission status update:", err));
    }

    return toCamelKeys(data);
}

// ─── Guard: leaf rows are locked once their payout is paid ───────────────────

export async function assertPayoutNotPaid(
    supabase: SupabaseClient,
    { tenantId, userId, date }: { tenantId: string; userId: string; date: string },
): Promise<{ id: string; status: string; startDate: string; endDate: string } | null> {
    const { data: payout } = await supabase
        .from("payroll_payouts")
        .select("id, status, start_date, end_date")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .lte("start_date", date)
        .gte("end_date", date)
        .maybeSingle();

    if ((payout as { status: string } | null)?.status === "paid") {
        throw Object.assign(new Error("Cannot change a decision after the payout has been paid"), { status: 422 });
    }

    if (!payout) return null;
    const row = payout as { id: string; status: string; start_date: string; end_date: string };
    return { id: row.id, status: row.status, startDate: row.start_date, endDate: row.end_date };
}
