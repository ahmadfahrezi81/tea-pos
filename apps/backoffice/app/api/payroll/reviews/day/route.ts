import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ReviewPayrollDayInput, ReviewPayrollDayResponse } from "@tea-pos/features/payroll/schema";
import { reviewPayrollDay } from "@tea-pos/services/payroll";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

/**
 * Approve or reject a whole day of a user's payroll in one call.
 *
 * The user id comes from the body because an admin is reviewing *someone
 * else's* payslip — but the tenant never does: it is resolved from the signed
 * cookie, so a body cannot reach into another tenant's rows.
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const body = ReviewPayrollDayInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const result = await reviewPayrollDay(supabase, {
            tenantId,
            actorId: user.id,
            userId: body.data.userId,
            date: body.data.date,
            status: body.data.status,
        });

        const parsed = ReviewPayrollDayResponse.safeParse(result);
        if (!parsed.success) return badRequest("Invalid response shape");
        return ok(parsed.data);
    } catch (error) {
        return handleError("POST /api/payroll/reviews/day", error);
    }
}
