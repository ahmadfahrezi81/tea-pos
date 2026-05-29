import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { StoreSessionResponse } from "@tea-pos/features/sessions/schema";
import { endSession } from "@tea-pos/services/sessions";
import { ok, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function PATCH(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const { id } = await params;

        const session = await endSession(supabase, { tenantId, sessionId: id, userId: user.id });

        const parsed = StoreSessionResponse.safeParse(session);
        if (!parsed.success) return ok(session);

        return ok(parsed.data);
    } catch (error) { return handleError("PATCH /api/sessions/[id]", error); }
}
