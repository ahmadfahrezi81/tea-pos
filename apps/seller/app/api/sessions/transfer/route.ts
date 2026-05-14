import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { TransferSessionInput, StoreSessionResponse } from "@tea-pos/features/sessions/schema";
import { transferSession } from "@tea-pos/services/sessions";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function POST(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const body = TransferSessionInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const session = await transferSession(supabase, {
            tenantId,
            userId: user.id,
            storeId: body.data.storeId,
            claimCode: body.data.claimCode,
        });

        const parsed = StoreSessionResponse.safeParse(session);
        if (!parsed.success) return ok(session);

        return ok(parsed.data);
    } catch (error) { return handleError("POST /api/sessions/transfer", error); }
}
