import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreateReimbursementInput,
    ListReimbursementsQuery,
    ReimbursementListResponse,
    ReimbursementResponse,
} from "@tea-pos/features/reimbursements/schema";
import { createReimbursement, listMyReimbursements } from "@tea-pos/services/reimbursements";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const query = ListReimbursementsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const claims = await listMyReimbursements(supabase, { tenantId, userId: user.id, ...query.data });

        const parsed = ReimbursementListResponse.safeParse({ claims });
        if (!parsed.success) return ok({ claims });

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/reimbursements", error); }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = CreateReimbursementInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const claim = await createReimbursement(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });

        const parsed = ReimbursementResponse.safeParse(claim);
        if (!parsed.success) return ok(claim);

        return ok(parsed.data);
    } catch (error) { return handleError("POST /api/reimbursements", error); }
}
