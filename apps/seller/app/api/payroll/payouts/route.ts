import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayoutsQuery, PayoutListResponse } from "@tea-pos/features/payroll/schema";
import { listPayouts, upsertPayout } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayoutsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const userId = user.role === "ADMIN" ? query.data.userId : user.id;
        const payouts = await listPayouts(supabase, { tenantId, periodId: query.data.periodId, userId });

        const parsed = PayoutListResponse.safeParse({ payouts });
        if (!parsed.success) return ok({ payouts });
        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/payroll/payouts", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = await request.json() as { periodId: string; userId: string };
        if (!body.periodId || !body.userId) return badRequest("periodId and userId required");

        const payout = await upsertPayout(supabase, { tenantId, periodId: body.periodId, userId: body.userId });
        return ok(payout);
    } catch (error) { return handleError("POST /api/payroll/payouts", error); }
}
