import type { SupabaseClient } from "@supabase/supabase-js";
import { toCamelKeys } from "@tea-pos/utils/schemas";
import { createLogger } from "./activity-logs";
import { seedTotalsFromOrders } from "./summaries";

function generateClaimCode(): string {
    return String(Math.floor(Math.random() * 90) + 10);
}

// ─── Gate state ───────────────────────────────────────────────────────────────

export interface GetStoreGateStateParams {
    tenantId: string;
    storeId: string;
    date: string;
}

export async function getStoreGateState(supabase: SupabaseClient, params: GetStoreGateStateParams) {
    const { tenantId, storeId, date } = params;

    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("id, closed_at")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("date", date)
        .maybeSingle();

    if (summaryError) throw summaryError;
    if (!summary) return { gate: "no_summary" as const };
    if (summary.closed_at) return { gate: "closed" as const, summaryId: summary.id, closedAt: summary.closed_at };

    const { data: session, error: sessionError } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) return { gate: "no_session" as const, summaryId: summary.id };

    const { data: userRow } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", session.user_id)
        .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(session.user_id);
    const avatarUrl = authUser?.user?.user_metadata?.avatar_url ?? null;

    return {
        gate: "open" as const,
        session: {
            ...toCamelKeys(session),
            userName: userRow?.full_name ?? null,
            userAvatarUrl: avatarUrl,
        },
    };
}

// ─── Resume session ────────────────────────────────────────────────────────────
// Creates a new session linked to an existing open summary (no_session edge case).

export interface ResumeSessionParams {
    tenantId: string;
    storeId: string;
    userId: string;
    summaryId: string;
}

export async function resumeSession(supabase: SupabaseClient, params: ResumeSessionParams) {
    const { tenantId, storeId, userId, summaryId } = params;

    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("id, closed_at")
        .eq("id", summaryId)
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (summaryError) throw summaryError;
    if (!summary) throw Object.assign(new Error("Summary not found"), { status: 404 });
    if (summary.closed_at) throw Object.assign(new Error("Summary is already closed"), { status: 409 });

    const { data: sessionData, error: sessionError } = await supabase
        .from("store_sessions")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            daily_summary_id: summaryId,
            user_id: userId,
            claim_code: generateClaimCode(),
        })
        .select()
        .single();

    if (sessionError || !sessionData) throw new Error(sessionError?.message ?? "Failed to create session");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("store_opened", {
        refId: summaryId,
        refTable: "store_daily_summaries",
        metadata: { resumed: true },
    });

    return { session: toCamelKeys(sessionData) };
}

// ─── Open store ───────────────────────────────────────────────────────────────
// Sequential: creates daily_summary first, then store_session with the returned id.

export interface OpenStoreParams {
    tenantId: string;
    storeId: string;
    userId: string;
    date: string;
    openingBalance?: number;
    openingCashBreakdown?: unknown;
}

export async function openStore(supabase: SupabaseClient, params: OpenStoreParams) {
    const { tenantId, storeId, userId, date, openingBalance = 0, openingCashBreakdown } = params;

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
    if ((count ?? 0) > 0)
        throw Object.assign(new Error("Store already opened for this date"), { status: 409 });

    const { totalSales, totalOrders, totalCups } = await seedTotalsFromOrders(supabase, storeId, tenantId, date);

    const { data: summaryData, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .insert({
            store_id: storeId,
            tenant_id: tenantId,
            opened_by: userId,
            date,
            opening_balance: openingBalance,
            opening_cash_breakdown: openingCashBreakdown ?? null,
            total_sales: totalSales,
            total_orders: totalOrders,
            total_cups: totalCups,
            total_expenses: 0,
            expected_cash: openingBalance + totalSales,
        })
        .select()
        .single();

    if (summaryError || !summaryData) throw new Error(summaryError?.message ?? "Failed to create daily summary");

    const dailySummaryId = (summaryData as { id: string }).id;

    const { data: sessionData, error: sessionError } = await supabase
        .from("store_sessions")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            daily_summary_id: dailySummaryId,
            user_id: userId,
            claim_code: generateClaimCode(),
        })
        .select()
        .single();

    if (sessionError || !sessionData) throw new Error(sessionError?.message ?? "Failed to create session");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("store_opened", {
        refId: dailySummaryId,
        refTable: "store_daily_summaries",
        metadata: { date, opening_balance: openingBalance },
    });

    return {
        session: toCamelKeys(sessionData),
        dailySummary: toCamelKeys(summaryData),
    };
}

// ─── Get active session ───────────────────────────────────────────────────────

export async function getActiveSession(
    supabase: SupabaseClient,
    { tenantId, storeId }: { tenantId: string; storeId: string },
) {
    const { data, error } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .maybeSingle();

    if (error) throw error;
    return data ? toCamelKeys(data) : null;
}

// ─── Transfer session ─────────────────────────────────────────────────────────

export interface TransferSessionParams {
    tenantId: string;
    storeId: string;
    userId: string;
    claimCode: string;
}

export async function transferSession(supabase: SupabaseClient, params: TransferSessionParams) {
    const { tenantId, storeId, userId, claimCode } = params;

    const { data: activeSession, error: fetchError } = await supabase
        .from("store_sessions")
        .select("*")
        .eq("store_id", storeId)
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .single();

    if (fetchError || !activeSession)
        throw Object.assign(new Error("No active session found"), { status: 404 });

    const session = activeSession as { id: string; claim_code: string; daily_summary_id: string };
    if (session.claim_code !== claimCode)
        throw Object.assign(new Error("Invalid claim code"), { status: 403 });

    const { error: endError } = await supabase
        .from("store_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("id", session.id)
        .eq("tenant_id", tenantId);

    if (endError) throw endError;

    const { data: newSession, error: newError } = await supabase
        .from("store_sessions")
        .insert({
            tenant_id: tenantId,
            store_id: storeId,
            daily_summary_id: session.daily_summary_id,
            user_id: userId,
            claim_code: generateClaimCode(),
            previous_session_id: session.id,
        })
        .select()
        .single();

    if (newError || !newSession) throw new Error(newError?.message ?? "Failed to create new session");

    const log = createLogger(supabase, { tenantId, userId, storeId });
    log("session_transferred", {
        refId: (newSession as { id: string }).id,
        refTable: "store_sessions",
        metadata: { previous_session_id: session.id, daily_summary_id: session.daily_summary_id },
    });

    return toCamelKeys(newSession);
}

// ─── End sessions for a summary ──────────────────────────────────────────────
// Called automatically when a daily_summary is closed. Not a user action.

export async function endSessionsForSummary(
    supabase: SupabaseClient,
    { tenantId, dailySummaryId }: { tenantId: string; dailySummaryId: string },
) {
    await supabase
        .from("store_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("daily_summary_id", dailySummaryId)
        .eq("tenant_id", tenantId)
        .eq("status", "active");
}

// ─── Sessions by summary IDs (internal helper) ───────────────────────────────

export async function fetchSessionUsersForSummaries(
    supabase: SupabaseClient,
    { tenantId, summaryIds }: { tenantId: string; summaryIds: string[] },
): Promise<Record<string, Array<{ userId: string; userName: string | null; userAvatarUrl: string | null; totalCups: number | null }>>> {
    if (summaryIds.length === 0) return {};

    const { data: sessions, error } = await supabase
        .from("store_sessions")
        .select("user_id, daily_summary_id, store_id, started_at, ended_at")
        .in("daily_summary_id", summaryIds)
        .eq("tenant_id", tenantId);

    if (error) throw error;
    if (!sessions || sessions.length === 0) return {};

    type SessionRow = { user_id: string; daily_summary_id: string; store_id: string; started_at: string; ended_at: string | null };
    const typedSessions = sessions as SessionRow[];

    // Group sessions by summaryId so each order query covers exactly one day —
    // avoids the 1000-row Supabase limit that a full-month batch query would hit.
    const sessionsBySummary = new Map<string, SessionRow[]>();
    for (const s of typedSessions) {
        if (!sessionsBySummary.has(s.daily_summary_id)) sessionsBySummary.set(s.daily_summary_id, []);
        sessionsBySummary.get(s.daily_summary_id)!.push(s);
    }

    const now = new Date().toISOString();
    const cupsMap = new Map<string, number>();

    await Promise.all(
        [...sessionsBySummary.entries()].map(async ([summaryId, summarySessions]) => {
            const userIds = [...new Set(summarySessions.map((s) => s.user_id))];
            const storeIds = [...new Set(summarySessions.map((s) => s.store_id))];
            const minStarted = summarySessions.reduce(
                (min, s) => (s.started_at < min ? s.started_at : min),
                summarySessions[0].started_at,
            );
            const maxEnded = summarySessions.reduce((max, s) => {
                const end = s.ended_at ?? now;
                return end > max ? end : max;
            }, summarySessions[0].ended_at ?? now);

            const { data: orderRows } = await supabase
                .from("store_orders")
                .select("user_id, store_id, created_at, store_order_items(quantity)")
                .eq("tenant_id", tenantId)
                .in("user_id", userIds)
                .in("store_id", storeIds)
                .gte("created_at", minStarted)
                .lte("created_at", maxEnded);

            for (const order of (orderRows ?? []) as Array<{ user_id: string; store_id: string; created_at: string; store_order_items?: Array<{ quantity: number }> }>) {
                const session = summarySessions.find(
                    (s) =>
                        s.user_id === order.user_id &&
                        s.store_id === order.store_id &&
                        order.created_at >= s.started_at &&
                        (s.ended_at === null || order.created_at < s.ended_at),
                );
                if (!session) continue;
                const key = `${summaryId}:${order.user_id}`;
                const cups = order.store_order_items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
                cupsMap.set(key, (cupsMap.get(key) ?? 0) + cups);
            }
        }),
    );

    const uniqueUserIds = [...new Set(typedSessions.map((s) => s.user_id))];

    const { data: userRows } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", uniqueUserIds);

    const nameMap = new Map((userRows ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? null]));

    const avatarMap = new Map<string, string | null>();
    await Promise.all(
        uniqueUserIds.map(async (userId) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            avatarMap.set(userId, (authUser?.user?.user_metadata?.avatar_url as string | undefined) ?? null);
        }),
    );

    const result: Record<string, Array<{ userId: string; userName: string | null; userAvatarUrl: string | null; totalCups: number | null }>> = {};
    for (const session of typedSessions) {
        const { daily_summary_id, user_id } = session;
        if (!result[daily_summary_id]) result[daily_summary_id] = [];
        if (!result[daily_summary_id].some((u) => u.userId === user_id)) {
            result[daily_summary_id].push({
                userId: user_id,
                userName: nameMap.get(user_id) ?? null,
                userAvatarUrl: avatarMap.get(user_id) ?? null,
                totalCups: cupsMap.get(`${daily_summary_id}:${user_id}`) ?? 0,
            });
        }
    }
    return result;
}

// ─── User session activity (streak grid) ─────────────────────────────────────

export async function listUserSessionDates(
    supabase: SupabaseClient,
    { tenantId, userId, weeks = 16 }: { tenantId: string; userId: string; weeks?: number },
): Promise<string[]> {
    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    const from = new Date();
    from.setDate(from.getDate() - weeks * 7);
    from.setUTCHours(0 - tz, 0, 0, 0);

    const { data, error } = await supabase
        .from("store_sessions")
        .select("started_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("started_at", from.toISOString());

    if (error) throw error;

    const dates = new Set<string>();
    for (const row of data ?? []) {
        const local = new Date(new Date(row.started_at).getTime() + tz * 60 * 60 * 1000);
        dates.add(local.toISOString().slice(0, 10));
    }

    return Array.from(dates).sort();
}

export async function listUserSessionDatesByMonth(
    supabase: SupabaseClient,
    { tenantId, userId, month }: { tenantId: string; userId: string; month: string },
): Promise<string[]> {
    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);

    const from = new Date(`${month}-01T00:00:00.000Z`);
    from.setUTCHours(0 - tz, 0, 0, 0);

    const to = new Date(from);
    to.setUTCMonth(to.getUTCMonth() + 1);

    const { data, error } = await supabase
        .from("store_sessions")
        .select("started_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .gte("started_at", from.toISOString())
        .lt("started_at", to.toISOString());

    if (error) throw error;

    const dates = new Set<string>();
    for (const row of data ?? []) {
        const local = new Date(new Date(row.started_at).getTime() + tz * 60 * 60 * 1000);
        dates.add(local.toISOString().slice(0, 10));
    }

    return Array.from(dates).sort();
}

// ─── Sessions by summary (detail view) ───────────────────────────────────────

export async function listSessionsBySummary(
    supabase: SupabaseClient,
    { tenantId, summaryId }: { tenantId: string; summaryId: string },
) {
    const { data: sessions, error } = await supabase
        .from("store_sessions")
        .select("id, user_id, started_at, ended_at, status, previous_session_id, claim_code")
        .eq("daily_summary_id", summaryId)
        .eq("tenant_id", tenantId)
        .order("started_at", { ascending: true });

    if (error) throw error;
    if (!sessions || sessions.length === 0) return { sessions: [] };

    const uniqueUserIds = [...new Set(sessions.map((s) => s.user_id))];

    const { data: userRows } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", uniqueUserIds);

    const nameMap = new Map(
        (userRows ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? null]),
    );

    const avatarMap = new Map<string, string | null>();
    await Promise.all(
        uniqueUserIds.map(async (userId) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            avatarMap.set(userId, (authUser?.user?.user_metadata?.avatar_url as string | undefined) ?? null);
        }),
    );

    return {
        sessions: sessions.map((s) => ({
            id: s.id,
            userId: s.user_id,
            userName: nameMap.get(s.user_id) ?? null,
            userAvatarUrl: avatarMap.get(s.user_id) ?? null,
            startedAt: s.started_at,
            endedAt: s.ended_at ?? null,
            status: s.status as "active" | "ended",
            previousSessionId: s.previous_session_id ?? null,
            claimCode: s.claim_code,
        })),
    };
}

// ─── End session ──────────────────────────────────────────────────────────────

export async function endSession(
    supabase: SupabaseClient,
    { tenantId, sessionId, userId }: { tenantId: string; sessionId: string; userId: string },
) {
    const { data, error } = await supabase
        .from("store_sessions")
        .update({ ended_at: new Date().toISOString(), status: "ended" })
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .select()
        .single();

    if (error || !data) throw Object.assign(new Error(error?.message ?? "Session not found"), { status: 404 });

    const raw = data as { store_id: string };
    const log = createLogger(supabase, { tenantId, userId, storeId: raw.store_id });
    log("session_ended", { refId: sessionId, refTable: "store_sessions" });

    return toCamelKeys(data);
}
