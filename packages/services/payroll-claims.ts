import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { startOfDay, endOfDay, parseISO, subHours, subDays } from "date-fns";
import { createLogger } from "./activity-logs";
import { getOrCreatePayrollPeriod, assertPayoutNotPaid } from "./payroll";

// ─── Create claim ─────────────────────────────────────────────────────────────

export interface CreatePayrollClaimParams {
    tenantId: string;
    userId: string;
    claimTypeId: string;
    amount: number;
    date: string;
    storeId?: string;
    notes?: string;
    photoUrl?: string;
}

export async function createPayrollClaim(
    supabase: SupabaseClient,
    params: CreatePayrollClaimParams,
) {
    const { tenantId, userId, claimTypeId, amount, date, storeId, notes, photoUrl } = params;

    // Max-lookback guard (14 days covers current + previous ISO week)
    const earliest = subDays(new Date(), 14).toISOString().slice(0, 10);
    if (date < earliest) {
        throw Object.assign(new Error("Claim date is too far in the past"), { status: 422 });
    }

    // 1. Resolve period from claim.date
    const period = await getOrCreatePayrollPeriod(supabase, { tenantId, date });

    // 2. Reject if the period is already closed
    if ((period as { closed_at: string | null }).closed_at) {
        throw Object.assign(new Error("This period is closed for new claims"), { status: 422 });
    }

    // 3. Resolve claim type and check eligibility
    const { data: claimType, error: typeError } = await supabase
        .from("payroll_claim_types")
        .select("id, frequency")
        .eq("id", claimTypeId)
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true)
        .single();

    if (typeError || !claimType) {
        throw Object.assign(new Error("Invalid or disabled claim type"), { status: 422 });
    }

    const { count: eligibleCount } = await supabase
        .from("payroll_claim_eligibility")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("claim_type_id", claimTypeId);

    if ((eligibleCount ?? 0) === 0) {
        throw Object.assign(new Error("You are not eligible to submit this claim type"), { status: 403 });
    }

    // 4. Frequency duplicate check
    const frequency = (claimType as { frequency: string }).frequency;

    if (frequency === "weekly") {
        const { count } = await supabase
            .from("payroll_claims")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("claim_type_id", claimTypeId)
            .eq("payroll_period_id", (period as { id: string }).id)
            .neq("status", "rejected");

        if ((count ?? 0) > 0) {
            throw Object.assign(new Error("You have already submitted this claim type for this period"), { status: 422 });
        }
    } else if (frequency === "monthly") {
        const monthStart = date.slice(0, 7) + "-01";
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString().slice(0, 10);

        const { count } = await supabase
            .from("payroll_claims")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("claim_type_id", claimTypeId)
            .gte("date", monthStart)
            .lt("date", monthEnd)
            .neq("status", "rejected");

        if ((count ?? 0) > 0) {
            throw Object.assign(new Error("You have already submitted this claim type this month"), { status: 422 });
        }
    } else if (frequency === "one_time") {
        const { count } = await supabase
            .from("payroll_claims")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("claim_type_id", claimTypeId)
            .neq("status", "rejected");

        if ((count ?? 0) > 0) {
            throw Object.assign(new Error("You have already submitted this one-time claim"), { status: 422 });
        }
    }

    // 5. Weekly: verify user had a session on the claim date (UTC+7 aware)
    if (frequency === "weekly") {
        const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
        const dayStart = subHours(startOfDay(parseISO(date)), tzOffset).toISOString();
        const dayEnd = subHours(endOfDay(parseISO(date)), tzOffset).toISOString();

        const { count: sessionCount } = await supabase
            .from("store_sessions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("tenant_id", tenantId)
            .gte("started_at", dayStart)
            .lte("started_at", dayEnd);

        if ((sessionCount ?? 0) === 0) {
            throw Object.assign(new Error("No session found for this date"), { status: 422 });
        }
    }

    // 6. Insert claim with period and type already resolved
    const { data, error } = await supabase
        .from("payroll_claims")
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            store_id: storeId ?? null,
            claim_type_id: claimTypeId,
            frequency,
            payroll_period_id: (period as { id: string }).id,
            amount,
            date,
            notes: notes ?? null,
            photo_url: photoUrl ?? null,
        })
        .select()
        .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create claim");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("claim_submitted", {
        refId: (data as { id: string }).id,
        refTable: "payroll_claims",
        metadata: { claim_type_id: claimTypeId, amount, date },
    });

    return toCamelKeys(data);
}

// ─── Auto claims (close-day triggered) ────────────────────────────────────────

export interface CreateAutoClaimsForDailySummaryParams {
    tenantId: string;
    storeId: string;
    dailySummaryId: string;
    date: string;
    triggeredByUserId: string;
}

export async function createAutoClaimsForDailySummary(
    supabase: SupabaseClient,
    params: CreateAutoClaimsForDailySummaryParams,
) {
    const { tenantId, storeId, dailySummaryId, date, triggeredByUserId } = params;

    const { data: sessions, error: sessionsError } = await supabase
        .from("store_sessions")
        .select("user_id, started_at, ended_at")
        .eq("daily_summary_id", dailySummaryId)
        .eq("tenant_id", tenantId);

    if (sessionsError) throw sessionsError;
    if (!sessions || sessions.length === 0) return [];

    type SessionRow = { user_id: string; started_at: string; ended_at: string | null };
    const typedSessions = sessions as SessionRow[];
    const userIds = [...new Set(typedSessions.map((s) => s.user_id))];

    const period = await getOrCreatePayrollPeriod(supabase, { tenantId, date });
    const created: unknown[] = [];

    for (const userId of userIds) {
        const userSessions = typedSessions.filter((s) => s.user_id === userId);
        const totalHours = userSessions.reduce((sum, s) => {
            const endedAt = s.ended_at ? new Date(s.ended_at) : new Date();
            return sum + (endedAt.getTime() - new Date(s.started_at).getTime()) / 3600000;
        }, 0);

        const { data: eligibilityRows } = await supabase
            .from("payroll_claim_eligibility")
            .select("claim_type_id, payroll_claim_types!inner(id, frequency, amount, claim_source, auto_threshold_hours)")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("payroll_claim_types.claim_source", "auto");

        type AutoType = { id: string; frequency: string; amount: number; claim_source: string; auto_threshold_hours: number | null };
        const autoTypes = (
            (eligibilityRows ?? []) as unknown as Array<{ payroll_claim_types: AutoType }>
        ).map((r) => r.payroll_claim_types);

        for (const type of autoTypes) {
            if (type.auto_threshold_hours === null) {
                console.warn(`[payroll] Auto claim type ${type.id} has no auto_threshold_hours configured — skipping`);
                continue;
            }

            const status = totalHours >= type.auto_threshold_hours ? "approved" : "rejected";

            const { data, error } = await supabase
                .from("payroll_claims")
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    store_id: storeId,
                    claim_type_id: type.id,
                    frequency: type.frequency,
                    payroll_period_id: (period as { id: string }).id,
                    amount: type.amount,
                    date,
                    status,
                    daily_summary_id: dailySummaryId,
                    hours_worked: totalHours,
                })
                .select()
                .single();

            if (error) {
                // Unique violation on (daily_summary_id, user_id, claim_type_id) means this
                // was already created by a previous attempt — treat as already-done, not an error.
                if (error.code === "23505") continue;
                throw error;
            }

            created.push(toCamelKeys(data));

            const log = createLogger(supabase, { tenantId, userId: triggeredByUserId, storeId });
            log("claim_submitted", {
                refId: (data as { id: string }).id,
                refTable: "payroll_claims",
                metadata: { claim_type_id: type.id, amount: type.amount, date },
            });
        }
    }

    return created;
}

// ─── Update claim status ──────────────────────────────────────────────────────

export async function updatePayrollClaimStatus(
    supabase: SupabaseClient,
    {
        id,
        tenantId,
        actorId,
        status,
    }: { id: string; tenantId: string; actorId: string; status: "pending" | "approved" | "rejected" },
) {
    const { data: claim, error: claimError } = await supabase
        .from("payroll_claims")
        .select("payroll_period_id, user_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (claimError || !claim) throw Object.assign(new Error(claimError?.message ?? "Claim not found"), { status: 404 });

    const row = claim as { payroll_period_id: string; user_id: string };
    await assertPayoutNotPaid(supabase, { tenantId, periodId: row.payroll_period_id, userId: row.user_id });

    const { data, error } = await supabase
        .from("payroll_claims")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Claim not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("claim_status_updated", {
        refId: id,
        refTable: "payroll_claims",
        metadata: { status },
    });

    return toCamelKeys(data);
}

// ─── List all claims (admin) ──────────────────────────────────────────────────

export async function listAllPayrollClaims(
    supabase: SupabaseClient,
    { tenantId, status, periodId }: { tenantId: string; status?: string; periodId?: string },
) {
    let query = supabase
        .from("payroll_claims")
        .select("*, payroll_claim_types!left(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (periodId) query = query.eq("payroll_period_id", periodId);

    const { data, error } = await query;
    if (error) throw error;

    const flat = (data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimType = row.payroll_claim_types as { name: string } | null;
        return { ...row, claim_type_name: claimType?.name ?? null, payroll_claim_types: undefined };
    });

    return toCamelKeys(flat);
}

// ─── List own claims ──────────────────────────────────────────────────────────

export async function listMyPayrollClaims(
    supabase: SupabaseClient,
    { tenantId, userId, limit }: { tenantId: string; userId: string; limit?: number },
) {
    let query = supabase
        .from("payroll_claims")
        .select("*, payroll_claim_types!left(name)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const flat = (data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimType = row.payroll_claim_types as { name: string } | null;
        return { ...row, claim_type_name: claimType?.name ?? null, payroll_claim_types: undefined };
    });

    return toCamelKeys(flat);
}

// ─── Get claimable dates (dates with sessions in a period) ───────────────────

export async function getClaimableDates(
    supabase: SupabaseClient,
    { tenantId, userId, periodId }: { tenantId: string; userId: string; periodId: string },
) {
    const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .select("start_date, end_date")
        .eq("id", periodId)
        .eq("tenant_id", tenantId)
        .single();

    if (periodError || !period) throw Object.assign(new Error("Period not found"), { status: 404 });

    const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
    const p = period as { start_date: string; end_date: string };
    const periodStart = subHours(startOfDay(parseISO(p.start_date)), tzOffset).toISOString();
    const periodEnd = subHours(endOfDay(parseISO(p.end_date)), tzOffset).toISOString();

    const { data: sessions } = await supabase
        .from("store_sessions")
        .select("started_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("started_at", periodStart)
        .lte("started_at", periodEnd);

    const dates = new Set<string>();
    for (const session of (sessions ?? []) as Array<{ started_at: string }>) {
        const localDate = new Date(new Date(session.started_at).getTime() + tzOffset * 60 * 60 * 1000);
        dates.add(localDate.toISOString().slice(0, 10));
    }

    return Array.from(dates).sort();
}

// ─── Get claimable types (eligible + claimable flag) ─────────────────────────

export async function getClaimableTypes(
    supabase: SupabaseClient,
    { tenantId, userId, periodId }: { tenantId: string; userId: string; periodId: string },
) {
    const { data: period, error: periodError } = await supabase
        .from("payroll_periods")
        .select("start_date, end_date")
        .eq("id", periodId)
        .eq("tenant_id", tenantId)
        .single();

    if (periodError || !period) throw Object.assign(new Error("Period not found"), { status: 404 });

    const p = period as { start_date: string; end_date: string };
    const monthStart = p.start_date.slice(0, 7) + "-01";
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    // Get eligible claim type IDs for this user
    const { data: eligibilityRows } = await supabase
        .from("payroll_claim_eligibility")
        .select("claim_type_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    if (!eligibilityRows || eligibilityRows.length === 0) return [];

    const typeIds = (eligibilityRows as Array<{ claim_type_id: string }>).map((e) => e.claim_type_id);

    // Fetch the enabled types
    const { data: types } = await supabase
        .from("payroll_claim_types")
        .select("id, name, frequency, amount, claim_source")
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true)
        .in("id", typeIds);

    if (!types || types.length === 0) return [];

    // Fetch all non-rejected existing claims for these types
    const { data: existingClaims } = await supabase
        .from("payroll_claims")
        .select("claim_type_id, payroll_period_id, date")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .in("claim_type_id", typeIds)
        .neq("status", "rejected");

    type ClaimRow = { claim_type_id: string; payroll_period_id: string; date: string };
    const claims = (existingClaims ?? []) as ClaimRow[];

    return (
        types as Array<{ id: string; name: string; frequency: string; amount: number; claim_source: string }>
    ).map((type) => {
        let claimable = true;

        if (type.frequency === "weekly") {
            claimable = !claims.some(
                (c) => c.claim_type_id === type.id && c.payroll_period_id === periodId,
            );
        } else if (type.frequency === "monthly") {
            claimable = !claims.some(
                (c) => c.claim_type_id === type.id && c.date >= monthStart && c.date < monthEnd,
            );
        } else if (type.frequency === "one_time") {
            claimable = !claims.some((c) => c.claim_type_id === type.id);
        }

        return {
            id: type.id,
            name: type.name,
            frequency: type.frequency,
            amount: type.amount ?? 0,
            claimSource: type.claim_source,
            claimable,
        };
    });
}
