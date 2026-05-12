import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    ListDailySummariesQuery, DailySummaryListResponse,
    CreateDailySummaryInput, CreateDailySummaryResponse,
    UpdateDailySummaryInput, UpdateDailySummaryResponse,
} from "@tea-pos/features/summaries/schema";
import { listSummaries, createSummary, updateSummary } from "@tea-pos/services/summaries";
import { ok, badRequest, err, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListDailySummariesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const { storeId, month } = query.data;
        if (!storeId || !month) return badRequest("Store ID and month are required");

        const data = await listSummaries(supabase, { tenantId, storeId, month });
        const parsed = DailySummaryListResponse.safeParse(data);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/summaries", error); }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateDailySummaryInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const summary = await createSummary(supabase, { tenantId, ...body.data });
        const parsed = CreateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) { return handleError("POST /api/summaries", error); }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = UpdateDailySummaryInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const summary = await updateSummary(supabase, { tenantId, ...body.data });
        const parsed = UpdateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("PUT /api/summaries", error); }
}
