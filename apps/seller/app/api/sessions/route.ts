import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { GetActiveSessionQuery, OpenStoreInput, OpenStoreResponse, StoreSessionResponse } from "@tea-pos/features/sessions/schema";
import { getActiveSession, openStore } from "@tea-pos/services/sessions";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = GetActiveSessionQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const session = await getActiveSession(supabase, { tenantId, storeId: query.data.storeId });
        if (!session) return ok(null);

        const parsed = StoreSessionResponse.safeParse(session);
        if (!parsed.success) return ok(session);

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/sessions", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = OpenStoreInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const result = await openStore(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });

        const parsed = OpenStoreResponse.safeParse(result);
        if (!parsed.success) return ok(result, 201);

        return ok(parsed.data, 201);
    } catch (error) { return handleError("POST /api/sessions", error); }
}
