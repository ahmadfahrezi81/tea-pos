import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { getPayWindowBounds } from "@tea-pos/utils/week";
import { startOfDay, endOfDay, parseISO, subHours, subDays } from "date-fns";
import { createLogger } from "./activity-logs";
import { assertPayoutNotPaid, upsertPayout } from "./payroll";
import { getPayrollUserInfo } from "./payroll-user-info";

// ─── Create claim ─────────────────────────────────────────────────────────────

export interface CreatePayrollClaimParams {
    tenantId: string;
    userId: string;
    claimConfigId: string;
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
    const { tenantId, userId, claimConfigId, amount, date, storeId, notes, photoUrl } = params;

    const earliest = subDays(new Date(), 14).toISOString().slice(0, 10);
    if (date < earliest) {
        throw Object.assign(new Error("Claim date is too far in the past"), { status: 422 });
    }

    // Reject if a paid payout already covers this date
    const { data: coveringPayout } = await supabase
        .from("payroll_payouts")
        .select("status")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .lte("start_date", date)
        .gte("end_date", date)
        .maybeSingle();

    if ((coveringPayout as { status: string } | null)?.status === "paid") {
        throw Object.assign(new Error("This pay period is already paid"), { status: 422 });
    }

    const { data: claimConfig, error: typeError } = await supabase
        .from("payroll_claim_configs")
        .select("id, frequency")
        .eq("id", claimConfigId)
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true)
        .single();

    if (typeError || !claimConfig) {
        throw Object.assign(new Error("Invalid or disabled claim type"), { status: 422 });
    }

    const { count: eligibleCount } = await supabase
        .from("payroll_user_claim_assignments")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("claim_config_id", claimConfigId);

    if ((eligibleCount ?? 0) === 0) {
        throw Object.assign(new Error("You are not eligible to submit this claim type"), { status: 403 });
    }

    const frequency = (claimConfig as { frequency: string }).frequency;

    // Frequency duplicate checks — all use date ranges, no period FK needed
    if (frequency === "weekly") {
        const { startDate: wStart, endDate: wEnd } = getPayWindowBounds(date, "weekly");
        const { count } = await supabase
            .from("payroll_claims")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("claim_config_id", claimConfigId)
            .gte("date", wStart)
            .lte("date", wEnd)
            .neq("status", "rejected");

        if ((count ?? 0) > 0) {
            throw Object.assign(new Error("You have already submitted this claim type for this week"), { status: 422 });
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
            .eq("claim_config_id", claimConfigId)
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
            .eq("claim_config_id", claimConfigId)
            .neq("status", "rejected");

        if ((count ?? 0) > 0) {
            throw Object.assign(new Error("You have already submitted this one-time claim"), { status: 422 });
        }
    }

    // Weekly claims require a session on the claim date (UTC+7 aware)
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

    const { data, error } = await supabase
        .from("payroll_claims")
        .insert({
            tenant_id: tenantId,
            user_id: userId,
            store_id: storeId ?? null,
            claim_config_id: claimConfigId,
            frequency,
            amount,
            date,
            notes: notes ?? null,
            photo_url: photoUrl ?? null,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw Object.assign(new Error("You have already submitted this claim today"), { status: 422 });
        }
        throw new Error(error.message);
    }
    if (!data) throw new Error("Failed to create claim");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("claim_submitted", {
        refId: (data as { id: string }).id,
        refTable: "payroll_claims",
        metadata: { claim_config_id: claimConfigId, amount, date },
    });

    // Refresh the payout for the user's pay window (backfill stamps payout_id on the new claim)
    const info = await getPayrollUserInfo(supabase, { tenantId, userId });
    if (info) {
        const payFrequency = (info.payFrequency as string | null) ?? "bi_weekly";
        const { startDate, endDate } = getPayWindowBounds(date, payFrequency);
        await upsertPayout(supabase, { tenantId, userId, startDate, endDate }).catch((err) =>
            console.warn("[payroll] upsertPayout failed after claim create:", err),
        );
    }

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
    const created: unknown[] = [];

    for (const userId of userIds) {
        const userSessions = typedSessions.filter((s) => s.user_id === userId);
        const totalHours = userSessions.reduce((sum, s) => {
            const endedAt = s.ended_at ? new Date(s.ended_at) : new Date();
            return sum + (endedAt.getTime() - new Date(s.started_at).getTime()) / 3600000;
        }, 0);

        const { data: eligibilityRows } = await supabase
            .from("payroll_user_claim_assignments")
            .select("claim_config_id, payroll_claim_configs!inner(id, frequency, amount, claim_source, auto_threshold_hours)")
            .eq("tenant_id", tenantId)
            .eq("user_id", userId)
            .eq("payroll_claim_configs.is_enabled", true);

        type AutoType = { id: string; frequency: string; amount: number; claim_source: string; auto_threshold_hours: number | null };
        const autoTypes = (
            (eligibilityRows ?? []) as unknown as Array<{ payroll_claim_configs: AutoType }>
        ).map((r) => r.payroll_claim_configs)
         .filter((t) => t.claim_source !== "manual");

        for (const type of autoTypes) {
            let status: string;
            if (type.claim_source === "auto_submit") {
                status = "pending";
            } else {
                if (type.auto_threshold_hours === null) {
                    console.warn(`[payroll] Auto claim type ${type.id} has no auto_threshold_hours configured — skipping`);
                    continue;
                }
                status = totalHours >= type.auto_threshold_hours ? "approved" : "rejected";
            }

            const { data, error } = await supabase
                .from("payroll_claims")
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    store_id: storeId,
                    claim_config_id: type.id,
                    frequency: type.frequency,
                    amount: type.amount,
                    date,
                    status,
                    daily_summary_id: dailySummaryId,
                    hours_worked: totalHours,
                })
                .select()
                .single();

            if (error) {
                if (error.code === "23505") continue;
                throw error;
            }

            created.push(toCamelKeys(data));

            const log = createLogger(supabase, { tenantId, userId: triggeredByUserId, storeId });
            log("claim_submitted", {
                refId: (data as { id: string }).id,
                refTable: "payroll_claims",
                metadata: { claim_config_id: type.id, amount: type.amount, date },
            });
        }

        // Refresh the payout after auto claims (backfill stamps payout_id on new claims)
        const info = await getPayrollUserInfo(supabase, { tenantId, userId });
        if (info) {
            const payFrequency = (info.payFrequency as string | null) ?? "bi_weekly";
            const { startDate, endDate } = getPayWindowBounds(date, payFrequency);
            await upsertPayout(supabase, { tenantId, userId, startDate, endDate }).catch((err) =>
                console.warn("[payroll] upsertPayout failed after auto claims:", err),
            );
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
        .select("date, user_id")
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .single();

    if (claimError || !claim) throw Object.assign(new Error(claimError?.message ?? "Claim not found"), { status: 404 });

    const row = claim as { date: string; user_id: string };
    const payoutRow = await assertPayoutNotPaid(supabase, { tenantId, userId: row.user_id, date: row.date });

    const { data, error } = await supabase
        .from("payroll_claims")
        .update({ status })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Claim not found"), { status: 404 });

    const log = createLogger(supabase, { tenantId, userId: actorId });
    log("claim_status_updated", { refId: id, refTable: "payroll_claims", metadata: { status } });

    if (payoutRow) {
        upsertPayout(supabase, {
            tenantId,
            userId: row.user_id,
            startDate: payoutRow.startDate,
            endDate: payoutRow.endDate,
        }).catch((err) => console.warn("[payroll] upsertPayout failed after claim status update:", err));
    }

    return toCamelKeys(data);
}

// ─── List all claims (admin) ──────────────────────────────────────────────────

export async function listAllPayrollClaims(
    supabase: SupabaseClient,
    {
        tenantId,
        status,
        startDate,
        endDate,
    }: { tenantId: string; status?: string; startDate?: string; endDate?: string },
) {
    let query = supabase
        .from("payroll_claims")
        .select("*, payroll_claim_configs!left(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data, error } = await query;
    if (error) throw error;

    const flat = (data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimConfig = row.payroll_claim_configs as { name: string } | null;
        return { ...row, claim_type_name: claimConfig?.name ?? null, payroll_claim_configs: undefined };
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
        .select("*, payroll_claim_configs!left(name)")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    const flat = (data ?? []).map((c) => {
        const row = c as Record<string, unknown>;
        const claimConfig = row.payroll_claim_configs as { name: string } | null;
        return { ...row, claim_type_name: claimConfig?.name ?? null, payroll_claim_configs: undefined };
    });

    return toCamelKeys(flat);
}

// ─── Get claimable dates (dates with sessions in a window) ───────────────────

export async function getClaimableDates(
    supabase: SupabaseClient,
    { tenantId, userId, startDate, endDate }: { tenantId: string; userId: string; startDate: string; endDate: string },
) {
    const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
    const windowStart = subHours(startOfDay(parseISO(startDate)), tzOffset).toISOString();
    const windowEnd = subHours(endOfDay(parseISO(endDate)), tzOffset).toISOString();

    const { data: sessions } = await supabase
        .from("store_sessions")
        .select("started_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("started_at", windowStart)
        .lte("started_at", windowEnd);

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
    { tenantId, userId, startDate, endDate }: { tenantId: string; userId: string; startDate: string; endDate: string },
) {
    const monthStart = startDate.slice(0, 7) + "-01";
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().slice(0, 10);

    const { data: eligibilityRows } = await supabase
        .from("payroll_user_claim_assignments")
        .select("claim_config_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

    if (!eligibilityRows || eligibilityRows.length === 0) return [];

    const configIds = (eligibilityRows as Array<{ claim_config_id: string }>).map((e) => e.claim_config_id);

    const { data: configs } = await supabase
        .from("payroll_claim_configs")
        .select("id, name, frequency, amount, claim_source")
        .eq("tenant_id", tenantId)
        .eq("is_enabled", true)
        .in("id", configIds);

    if (!configs || configs.length === 0) return [];

    const { data: existingClaims } = await supabase
        .from("payroll_claims")
        .select("claim_config_id, date")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .in("claim_config_id", configIds)
        .neq("status", "rejected");

    type ClaimRow = { claim_config_id: string; date: string };
    const claims = (existingClaims ?? []) as ClaimRow[];

    return (
        configs as Array<{ id: string; name: string; frequency: string; amount: number; claim_source: string }>
    ).map((config) => {
        let claimable = true;

        if (config.frequency === "weekly") {
            claimable = !claims.some(
                (c) => c.claim_config_id === config.id && c.date >= startDate && c.date <= endDate,
            );
        } else if (config.frequency === "monthly") {
            claimable = !claims.some(
                (c) => c.claim_config_id === config.id && c.date >= monthStart && c.date < monthEnd,
            );
        } else if (config.frequency === "one_time") {
            claimable = !claims.some((c) => c.claim_config_id === config.id);
        } else if (config.frequency === "daily") {
            const tzOffset = parseInt(process.env.TIMEZONE_OFFSET ?? "7");
            const today = new Date(Date.now() + tzOffset * 3_600_000).toISOString().slice(0, 10);
            claimable = !claims.some((c) => c.claim_config_id === config.id && c.date === today);
        }

        return {
            id: config.id,
            name: config.name,
            frequency: config.frequency,
            amount: config.amount ?? 0,
            claimSource: config.claim_source,
            claimable,
        };
    });
}
