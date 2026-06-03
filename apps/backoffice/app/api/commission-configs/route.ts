import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    GetCommissionRateQuery,
    CommissionRateResponse,
    UpsertCommissionConfigInput,
    CommissionConfigResponse,
} from "@tea-pos/features/commission-configs/schema";
import { getCommissionRate, upsertCommissionConfig } from "@tea-pos/services/commission-configs";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = GetCommissionRateQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const result = await getCommissionRate(supabase, { tenantId, userId: query.data.userId });
        return ok(CommissionRateResponse.parse(result));
    } catch (error) { return handleError("GET /api/commission-configs", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = UpsertCommissionConfigInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const config = await upsertCommissionConfig(supabase, { tenantId, actorId: user.id, ...body.data });
        const parsed = CommissionConfigResponse.safeParse(config);
        return ok(parsed.success ? parsed.data : config);
    } catch (error) { return handleError("POST /api/commission-configs", error); }
}
