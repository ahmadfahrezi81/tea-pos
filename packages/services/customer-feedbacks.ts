import type { SupabaseClient } from "@supabase/supabase-js";
import type {
    CreateCustomerFeedbackInput,
    CustomerFeedbackResponse,
} from "@tea-pos/features/customer-feedbacks/schema";
import { createLogger } from "./activity-logs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCustomerFeedbackParams {
    input: CreateCustomerFeedbackInput;
    tenantId: string;
    userId: string;
}

export interface ListCustomerFeedbacksParams {
    tenantId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): CustomerFeedbackResponse {
    const profile = row.profiles as { full_name?: string } | null;
    return {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        userId: row.user_id as string,
        userName: profile?.full_name ?? null,
        locationName: row.location_name as string,
        locationDisplay: row.location_display as string,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        notes: (row.notes as string) ?? null,
        createdAt: row.created_at as string,
    };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function createCustomerFeedback(
    supabase: SupabaseClient,
    { input, tenantId, userId }: CreateCustomerFeedbackParams,
): Promise<{
    data: CustomerFeedbackResponse | null;
    error?: string;
}> {
    try {
        const { data, error } = await supabase
            .from("customer_feedbacks")
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                location_name: input.locationName,
                location_display: input.locationDisplay,
                latitude: input.latitude,
                longitude: input.longitude,
                notes: input.notes ?? null,
            })
            .select("*, profiles(full_name)")
            .single();

        if (error) {
            console.error("[createCustomerFeedback] Supabase error:", error);
            return { data: null, error: error.message };
        }

        const mapped = mapRow(data as Record<string, unknown>);
        createLogger(supabase, { tenantId, userId })("customer_feedback_submitted", {
            refId: mapped.id,
            refTable: "customer_feedbacks",
            metadata: { location_name: input.locationName, has_notes: !!input.notes },
        });
        return { data: mapped };
    } catch (err) {
        console.error("[createCustomerFeedback] Unexpected error:", err);
        return { data: null, error: "Unexpected error creating feedback" };
    }
}

export async function listCustomerFeedbacks(
    supabase: SupabaseClient,
    params: ListCustomerFeedbacksParams = {},
): Promise<{
    data: CustomerFeedbackResponse[] | null;
    total: number;
    error?: string;
}> {
    try {
        const { tenantId, userId, limit = 20, offset = 0 } = params;

        let query = supabase
            .from("customer_feedbacks")
            .select("*, profiles(full_name)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (tenantId) query = query.eq("tenant_id", tenantId);
        if (userId) query = query.eq("user_id", userId);

        const { data, error, count } = await query;

        if (error) {
            console.error("[listCustomerFeedbacks] Supabase error:", error);
            return { data: null, total: 0, error: error.message };
        }

        return {
            data: (data ?? []).map((row) =>
                mapRow(row as Record<string, unknown>),
            ),
            total: count ?? 0,
        };
    } catch (err) {
        console.error("[listCustomerFeedbacks] Unexpected error:", err);
        return {
            data: null,
            total: 0,
            error: "Unexpected error listing feedbacks",
        };
    }
}
