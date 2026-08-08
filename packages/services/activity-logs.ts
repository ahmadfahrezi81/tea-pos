import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLogMetadataMap, ActivityLogType, DayActivityResponse, EventSegment } from "@tea-pos/features/activity-logs/schema";

// All event types including order_created — full audit log for the day
const DAY_ACTIVITY_EVENT_TYPES: ActivityLogType[] = [
    "order_created",
    "store_opened",
    "store_closed",
    "opening_balance_updated",
    "summary_photo_uploaded",
    "summary_photo_deleted",
    "summary_photo_updated",
    "expense_created",
    "expense_updated",
    "expense_deleted",
    "session_transferred",
    "session_ended",
    "supply_request_created",
    "incident_report_created",
];

export async function getDayActivity(
    supabase: SupabaseClient,
    { tenantId, summaryId }: { tenantId: string; summaryId: string },
): Promise<DayActivityResponse> {
    // The summary, with the store name embedded rather than fetched separately.
    const { data: summary, error: summaryError } = await supabase
        .from("store_daily_summaries")
        .select("id, store_id, date, total_sales, total_orders, total_cups, opening_balance, variance, closed_at, stores(name)")
        .eq("id", summaryId)
        .eq("tenant_id", tenantId)
        .single();

    if (summaryError || !summary) throw Object.assign(new Error("Summary not found"), { status: 404 });

    // PostgREST returns a to-one embed as an object, but the generated types
    // widen it to an array — accept either rather than casting through unknown
    // and being silently wrong if that ever changes.
    const storeEmbed = summary.stores as { name: string } | { name: string }[] | null;
    const storeName = (Array.isArray(storeEmbed) ? storeEmbed[0]?.name : storeEmbed?.name) ?? "Store";

    const summaryContext = {
        date: summary.date as string,
        storeName,
        totalSales: summary.total_sales as number,
        totalOrders: summary.total_orders as number,
        totalCups: summary.total_cups as number,
        openingBalance: summary.opening_balance as number,
        variance: summary.variance as number | null,
        closedAt: summary.closed_at as string | null,
    };

    // Events come straight off the column now. This used to be seven parallel
    // queries collecting child row ids, then `.in("ref_id", <every id>)` — an
    // IN list holding every order id for the day, sent in the query string, so
    // its size grew with orders per day until it would eventually blow the URL
    // limit. `daily_summary_id` is the relationship those queries were
    // reconstructing on every request.
    const { data: eventRows, error: eventError } = await supabase
        .from("tenant_activity_logs")
        .select("id, type, created_at, metadata, ref_id, ref_table, user_id")
        .eq("tenant_id", tenantId)
        .eq("daily_summary_id", summaryId)
        .in("type", DAY_ACTIVITY_EVENT_TYPES)
        .order("created_at", { ascending: true });

    if (eventError) throw eventError;

    const rows = eventRows ?? [];

    // Batch-resolve user names
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const userNameMap = new Map<string, string>();
    if (userIds.length > 0) {
        const { data: userRows } = await supabase
            .from("users")
            .select("id, full_name")
            .in("id", userIds);
        (userRows ?? []).forEach((u) => userNameMap.set(u.id, u.full_name));
    }

    // Sign photo URLs — daily-photos bucket is private, public URLs don't work
    const PHOTO_BUCKET = "daily-photos";
    const signedUrlMap = new Map<string, string>();
    const photoRows = rows.filter(
        (r) => (r.type === "summary_photo_uploaded" || r.type === "summary_photo_deleted" || r.type === "summary_photo_updated")
            && typeof (r.metadata as Record<string, unknown>)?.photo_url === "string",
    );
    await Promise.all(
        photoRows.map(async (r) => {
            const rawUrl = (r.metadata as Record<string, unknown>).photo_url as string;
            const storagePath = rawUrl.split(`/${PHOTO_BUCKET}/`)[1];
            if (!storagePath) return;
            const { data } = await supabase.storage
                .from(PHOTO_BUCKET)
                .createSignedUrl(storagePath, 60 * 60);
            if (data?.signedUrl) signedUrlMap.set(r.id, data.signedUrl);
        }),
    );

    const segments: EventSegment[] = rows.map((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        const signedPhotoUrl = signedUrlMap.get(row.id);
        return {
            id: row.id,
            type: row.type as ActivityLogType,
            createdAt: row.created_at,
            userName: userNameMap.get(row.user_id) ?? "Unknown",
            metadata: signedPhotoUrl ? { ...meta, photo_url: signedPhotoUrl } : meta,
            refId: row.ref_id,
            refTable: row.ref_table,
        };
    });

    return { summary: summaryContext, segments };
}

interface LogContext {
    tenantId: string;
    userId: string;
    storeId?: string;
    /**
     * The daily summary this event belongs to. Optional because payroll and
     * customer-feedback events genuinely have no summary — but set it wherever
     * one is in scope: `getDayActivity` keys the timeline on this column, and
     * an event logged without it will not appear there.
     */
    dailySummaryId?: string;
}

interface LogOpts<T extends ActivityLogType> {
    refId?: string;
    refTable?: string;
    metadata?: ActivityLogMetadataMap[T];
    /** Overrides the logger's context, for the rare event that belongs to a different day. */
    dailySummaryId?: string;
}

async function logActivity<T extends ActivityLogType>(
    supabase: SupabaseClient,
    context: LogContext,
    type: T,
    opts?: LogOpts<T>,
): Promise<void> {
    try {
        await supabase.from("tenant_activity_logs").insert({
            tenant_id: context.tenantId,
            user_id: context.userId,
            store_id: context.storeId ?? null,
            type,
            ref_id: opts?.refId ?? null,
            ref_table: opts?.refTable ?? null,
            daily_summary_id: opts?.dailySummaryId ?? context.dailySummaryId ?? null,
            metadata: (opts?.metadata ?? {}) as Record<string, unknown>,
        });
    } catch {
        // fire-and-forget — logging failures must never break the calling service
    }
}

export function createLogger(supabase: SupabaseClient, context: LogContext) {
    return <T extends ActivityLogType>(type: T, opts?: LogOpts<T>): void => {
        void logActivity(supabase, context, type, opts);
    };
}
