import { createRouteHandlerClient } from "@/lib/supabase/server";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
    ListDailySummariesQuery, DailySummaryListResponse,
    CreateDailySummaryInput, CreateDailySummaryResponse,
    UpdateDailySummaryInput, UpdateDailySummaryResponse,
} from "@tea-pos/features/summaries/schema";
import { listSummaries, createSummary, updateSummary } from "@tea-pos/services/summaries";

function errResponse(error: unknown) {
    const status = (error as { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status });
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const query = ListDailySummariesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });

        const { storeId, month } = query.data;
        if (!storeId || !month) return NextResponse.json({ error: "Store ID and month are required" }, { status: 400 });

        const data = await listSummaries(supabase, { tenantId, storeId, month });
        const parsed = DailySummaryListResponse.safeParse(data);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateDailySummaryInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const summary = await createSummary(supabase, { tenantId, ...body.data });
        const parsed = CreateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data, { status: 201 });
    } catch (error) { return errResponse(error); }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createRouteHandlerClient();
        const tenantId = await getCurrentTenantId();
        const body = UpdateDailySummaryInput.safeParse(await request.json());
        if (!body.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

        const summary = await updateSummary(supabase, { tenantId, ...body.data });
        const parsed = UpdateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return NextResponse.json({ error: "Invalid response shape" }, { status: 500 });

        return NextResponse.json(parsed.data);
    } catch (error) { return errResponse(error); }
}
