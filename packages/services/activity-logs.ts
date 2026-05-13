import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityLogType } from "@tea-pos/features/activity-logs/schema";

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
