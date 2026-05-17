import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreateSupplyRequestInput,
    ListSupplyRequestsQuery,
    SupplyRequestResponse,
    SupplyRequestListResponse,
} from "@tea-pos/features/requests/schema";
import { createSupplyRequest, listSupplyRequests } from "@tea-pos/services/requests";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListSupplyRequestsQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const data = await listSupplyRequests(supabase, { tenantId, ...query.data });
        const parsed = SupplyRequestListResponse.safeParse({ requests: data });
        if (!parsed.success) return badRequest("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/requests", error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = CreateSupplyRequestInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const data = await createSupplyRequest(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });
        const parsed = SupplyRequestResponse.safeParse(data);
        if (!parsed.success) return badRequest("Invalid response shape");

        return ok(parsed.data, 201);
    } catch (error) {
        return handleError("POST /api/requests", error);
    }
}
