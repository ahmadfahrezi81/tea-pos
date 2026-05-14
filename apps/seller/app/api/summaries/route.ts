import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    ListDailySummariesQuery, DailySummaryListResponse,
    CreateDailySummaryInput, CreateDailySummaryResponse,
    UpdateDailySummaryInput, UpdateDailySummaryResponse,
} from "@tea-pos/features/summaries/schema";
import { listSummaries, createSummary, updateSummary } from "@tea-pos/services/summaries";
import { createPayrollEntries } from "@tea-pos/services/payroll";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

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

        const summary = await createSummary(supabase, {
            tenantId,
            storeId: body.data.storeId,
            openedBy: body.data.openedBy,
            date: body.data.date,
            openingBalance: body.data.openingBalance,
            openingCashBreakdown: body.data.openingCashBreakdown,
        });
        const parsed = CreateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) { return handleError("POST /api/summaries", error); }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = UpdateDailySummaryInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const summary = await updateSummary(supabase, { tenantId, userId: user.id, ...body.data });

        // Trigger payroll entries when closing the summary
        if (body.data.closedAt) {
            const s = summary as { id: string; storeId: string; date: string };
            createPayrollEntries(supabase, {
                tenantId,
                storeId: s.storeId,
                dailySummaryId: s.id,
                date: s.date,
                triggeredByUserId: user.id,
            }).catch((e) => console.error("createPayrollEntries failed:", e));
        }

        const parsed = UpdateDailySummaryResponse.safeParse(summary);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) { return handleError("PUT /api/summaries", error); }
}
