import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    CreateReimbursementInput,
    ListReimbursementsQuery,
    ReimbursementListResponse,
    ReimbursementResponse,
} from "@tea-pos/features/reimbursements/schema";
import { createReimbursement, listMyReimbursements, listAllReimbursements } from "@tea-pos/services/reimbursements";
import { ListAllReimbursementsQuery } from "@tea-pos/features/reimbursements/schema";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { isFlagEnabled, FLAGS } from "@/lib/flags";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const reimbursementEnabled = await isFlagEnabled(FLAGS.FEATURE.REIMBURSEMENT, user.id, { role: user.role, tenantId });
        if (!reimbursementEnabled) return forbidden("Reimbursements are not available");

        const searchParams = Object.fromEntries(new URL(request.url).searchParams);

        if (user.role === "ADMIN" && searchParams.all === "true") {
            const allQuery = ListAllReimbursementsQuery.safeParse(searchParams);
            if (!allQuery.success) return badRequest("Invalid query parameters");
            const claims = await listAllReimbursements(supabase, { tenantId, status: allQuery.data.status });
            const parsed = ReimbursementListResponse.safeParse({ claims });
            return ok(parsed.success ? parsed.data : { claims });
        }

        const query = ListReimbursementsQuery.safeParse(searchParams);
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

        const reimbursementEnabled = await isFlagEnabled(FLAGS.FEATURE.REIMBURSEMENT, user.id, { role: user.role, tenantId });
        if (!reimbursementEnabled) return forbidden("Reimbursements are not available");
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
