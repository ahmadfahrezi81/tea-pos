import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { listCustomerFeedbacks } from "@tea-pos/services/customer-feedbacks";
import { ListCustomerFeedbacksQuery } from "@tea-pos/features/customer-feedbacks/schema";
import { ok, badRequest, err, unauthorized, handleError } from "@/lib/api/response";

/**
 * Read-only: backoffice reviews the locations staff scouted, it does not submit
 * them. The tenant comes from the cookie, never the query — this route runs on
 * the service-role key, so the filter is the only isolation there is.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const { searchParams } = new URL(request.url);
        const parsed = ListCustomerFeedbacksQuery.safeParse({
            tenantId,
            userId: searchParams.get("userId") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
            offset: searchParams.get("offset") ?? undefined,
        });
        if (!parsed.success) return badRequest("Invalid query params");

        const { data, total, error } = await listCustomerFeedbacks(supabase, parsed.data);
        if (error) return err(error as string);

        return ok({ feedbacks: data, total });
    } catch (error) {
        return handleError("GET /api/customer-feedbacks", error);
    }
}
