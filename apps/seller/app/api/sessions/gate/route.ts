import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetGateStateQuery, GateStateResponse } from "@tea-pos/features/sessions/schema";
import { getStoreGateState } from "@tea-pos/services/sessions";
import { ok, badRequest, handleError } from "@/lib/api/response";

function getTodayStr(): string {
    const tz = parseInt(process.env.TIMEZONE_OFFSET ?? "7", 10);
    return new Date(new Date().getTime() + tz * 3600000).toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = GetGateStateQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const date = getTodayStr();
        const state = await getStoreGateState(supabase, { tenantId, storeId: query.data.storeId, date });
        return ok(GateStateResponse.parse(state));
    } catch (error) { return handleError("GET /api/sessions/gate", error); }
}
