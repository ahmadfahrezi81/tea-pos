import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLogType } from "@tea-pos/features/activity-logs/schema";

// ─── Timeline event types — curated subset shown in AtAGlance ─────────────────

const TIMELINE_EVENT_TYPES: ActivityLogType[] = [
    "store_open",
    "session_transferred",
    "expense_created",
    "daily_summary_closed",
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
        .from("activity_logs")
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

interface LogContext {
    tenantId: string;
    userId: string;
    storeId?: string;
}

interface LogOpts {
    refId?: string;
    refTable?: string;
    metadata?: Record<string, unknown>;
}

async function logActivity(
    supabase: SupabaseClient,
    context: LogContext,
    type: ActivityLogType,
    opts?: LogOpts,
): Promise<void> {
    try {
        await supabase.from("activity_logs").insert({
            tenant_id: context.tenantId,
            user_id: context.userId,
            store_id: context.storeId ?? null,
            type,
            ref_id: opts?.refId ?? null,
            ref_table: opts?.refTable ?? null,
            metadata: opts?.metadata ?? {},
        });
    } catch {
        // fire-and-forget — logging failures must never break the calling service
    }
}

export function createLogger(supabase: SupabaseClient, context: LogContext) {
    return (type: ActivityLogType, opts?: LogOpts): void => {
        void logActivity(supabase, context, type, opts);
    };
}
