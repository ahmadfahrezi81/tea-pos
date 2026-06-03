import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListAllReimbursementsQuery, ReimbursementListResponse } from "@tea-pos/features/reimbursements/schema";
import { listAllReimbursements } from "@tea-pos/services/reimbursements";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListAllReimbursementsQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        const claims = await listAllReimbursements(supabase, { tenantId, status: query.data.status });
        const parsed = ReimbursementListResponse.safeParse({ claims });
        return ok(parsed.success ? parsed.data : { claims });
    } catch (error) { return handleError("GET /api/reimbursements", error); }
}
