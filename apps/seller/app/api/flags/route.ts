import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { evaluateFlagSet } from "@/lib/flags";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const tenantId = await getCurrentTenantId();
        const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
        const props = { role: user.role, tenantId, ...(storeId && { storeId }) };

        return ok(await evaluateFlagSet(user.id, props));
    } catch (error) {
        return handleError("GET /api/flags", error);
    }
}
