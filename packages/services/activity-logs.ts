import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLogMetadataMap, ActivityLogType, EventSegment } from "@tea-pos/features/activity-logs/schema";

// ─── Timeline event types — curated subset shown in AtAGlance ─────────────────

const TIMELINE_EVENT_TYPES: ActivityLogType[] = [
    "store_opened",
    "session_transferred",
    "session_ended",
    "expense_created",
    "store_closed",
    "supply_request_created",
    "incident_report_created",
];

export async function listStoreActivityLogs(
    supabase: SupabaseClient,
    { tenantId, storeId, date }: { tenantId: string; storeId: string; date: string },
) {
    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    const [year, month, day] = date.split("-").map(Number);
    const dayStartMs = Date.UTC(year, month - 1, day) - tz * 3600 * 1000;
    const dayStart = new Date(dayStartMs).toISOString();
    const dayEnd = new Date(dayStartMs + 24 * 3600 * 1000 - 1).toISOString();

    const { data, error } = await supabase
        .from("tenant_activity_logs")
        .select("id, type, created_at")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .in("type", TIMELINE_EVENT_TYPES)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type as ActivityLogType,
        createdAt: row.created_at,
    }));
}

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
    "customer_feedback_submitted",
    "session_transferred",
    "session_ended",
    "supply_request_created",
    "incident_report_created",
];

export async function getDayActivity(
    supabase: SupabaseClient,
    { tenantId, storeId, date }: { tenantId: string; storeId: string; date: string },
): Promise<EventSegment[]> {
    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    const [year, month, day] = date.split("-").map(Number);
    const dayStartMs = Date.UTC(year, month - 1, day) - tz * 3600 * 1000;
    const dayStart = new Date(dayStartMs).toISOString();
    const dayEnd = new Date(dayStartMs + 24 * 3600 * 1000 - 1).toISOString();

    const { data: eventRows, error: eventError } = await supabase
        .from("tenant_activity_logs")
        .select("id, type, created_at, metadata, ref_id, ref_table, user_id")
        .eq("tenant_id", tenantId)
        .eq("store_id", storeId)
        .in("type", DAY_ACTIVITY_EVENT_TYPES)
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
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

    return rows.map((row) => {
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
}

interface LogContext {
    tenantId: string;
    userId: string;
    storeId?: string;
}

interface LogOpts<T extends ActivityLogType> {
    refId?: string;
    refTable?: string;
    metadata?: ActivityLogMetadataMap[T];
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
