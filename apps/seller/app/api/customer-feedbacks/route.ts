import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import {
    createCustomerFeedback,
    listCustomerFeedbacks,
} from "@tea-pos/services/customer-feedbacks";
import {
    CreateCustomerFeedbackInput,
    ListCustomerFeedbacksQuery,
} from "@tea-pos/features/customer-feedbacks/schema";

// ─── GET /api/customer-feedbacks ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const { searchParams } = new URL(request.url);
        const parsed = ListCustomerFeedbacksQuery.safeParse({
            tenantId: searchParams.get("tenantId") ?? undefined,
            userId: searchParams.get("userId") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
            offset: searchParams.get("offset") ?? undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid query params",
                    details: parsed.error.format(),
                },
                { status: 400 },
            );
        }

        const { data, total, error } = await listCustomerFeedbacks(
            supabase,
            parsed.data,
        );

        if (error) return NextResponse.json({ error }, { status: 500 });

        return NextResponse.json({ feedbacks: data, total });
    } catch (error) {
        console.error("[GET /api/customer-feedbacks]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}

// ─── POST /api/customer-feedbacks ────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 },
            );
        }

        const tenantId = await getCurrentTenantId();

        const body = await request.json();
        const parsed = CreateCustomerFeedbackInput.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    error: "Invalid request body",
                    details: parsed.error.format(),
                },
                { status: 400 },
            );
        }

        const { data, error } = await createCustomerFeedback(supabase, {
            input: parsed.data,
            tenantId,
            userId: user.id,
        });

        if (error) return NextResponse.json({ error }, { status: 500 });

        return NextResponse.json(
            { success: true, feedback: data },
            { status: 201 },
        );
    } catch (error) {
        console.error("[POST /api/customer-feedbacks]", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 },
        );
    }
}
