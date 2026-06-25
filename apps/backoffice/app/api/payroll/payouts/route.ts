import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";
import { listPayouts, upsertPayout } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayoutsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const payouts = await listPayouts(supabase, { tenantId, userId: query.data.userId, startDate: query.data.startDate, endDate: query.data.endDate });
        const parsed = PayoutListResponse.safeParse({ payouts });
        return ok(parsed.success ? parsed.data : { payouts });
    } catch (error) { return handleError("GET /api/payroll/payouts", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = await request.json() as { startDate: string; endDate: string; userId: string };
        if (!body.startDate || !body.endDate || !body.userId) return badRequest("startDate, endDate, and userId required");

        const payout = await upsertPayout(supabase, { tenantId, userId: body.userId, startDate: body.startDate, endDate: body.endDate });
        return ok(payout);
    } catch (error) { return handleError("POST /api/payroll/payouts", error); }
}
