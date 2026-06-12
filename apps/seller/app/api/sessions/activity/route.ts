import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { listUserSessionDates } from "@tea-pos/services/sessions";
import { ok, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { z } from "zod";

const Query = z.object({
    weeks: z.coerce.number().int().min(1).max(52).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const params = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        const weeks = params.success ? params.data.weeks : undefined;

        const dates = await listUserSessionDates(supabase, { tenantId, userId: user.id, weeks });
        return ok({ dates });
    } catch (error) {
        return handleError("GET /api/sessions/activity", error);
    }
}
