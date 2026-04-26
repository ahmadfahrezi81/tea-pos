import { createRouteHandlerClient } from "@/lib/server/supabase/server";
import type {
    CreateCustomerFeedbackInput,
    CustomerFeedbackResponse,
} from "@/lib/shared/schemas/customer-feedbacks";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateCustomerFeedbackParams {
    input: CreateCustomerFeedbackInput;
    tenantId: string;
    sellerId: string;
}

export interface ListCustomerFeedbacksParams {
    tenantId?: string;
    sellerId?: string;
    limit?: number;
    offset?: number;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function mapRow(row: Record<string, unknown>): CustomerFeedbackResponse {
    return {
        id: row.id as string,
        tenantId: row.tenant_id as string,
        sellerId: row.seller_id as string,
        locationName: row.location_name as string,
        locationDisplay: row.location_display as string,
        latitude: row.latitude as number,
        longitude: row.longitude as number,
        notes: (row.notes as string) ?? null,
        createdAt: row.created_at as string,
    };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function createCustomerFeedback({
    input,
    tenantId,
    sellerId,
}: CreateCustomerFeedbackParams): Promise<{
    data: CustomerFeedbackResponse | null;
    error?: string;
}> {
    try {
        const supabase = await createRouteHandlerClient();

        const { data, error } = await supabase
            .from("customer_feedbacks")
            .insert({
                tenant_id: tenantId,
                seller_id: sellerId,
                location_name: input.locationName,
                location_display: input.locationDisplay,
                latitude: input.latitude,
                longitude: input.longitude,
                notes: input.notes ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error("[createCustomerFeedback] Supabase error:", error);
            return { data: null, error: error.message };
        }

        return { data: mapRow(data as Record<string, unknown>) };
    } catch (err) {
        console.error("[createCustomerFeedback] Unexpected error:", err);
        return { data: null, error: "Unexpected error creating feedback" };
    }
}

export async function listCustomerFeedbacks(
    params: ListCustomerFeedbacksParams = {},
): Promise<{
    data: CustomerFeedbackResponse[] | null;
    total: number;
    error?: string;
}> {
    try {
        const supabase = await createRouteHandlerClient();
        const { tenantId, sellerId, limit = 20, offset = 0 } = params;

        let query = supabase
            .from("customer_feedbacks")
            .select("*", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (tenantId) query = query.eq("tenant_id", tenantId);
        if (sellerId) query = query.eq("seller_id", sellerId);

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
