import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { unauthorized, handleError, ok } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { listTenantUsers } from "@tea-pos/services/users";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();
        const users = await listTenantUsers(supabase, { tenantId });
        return ok({ users });
    } catch (error) {
        return handleError("GET /api/users", error);
    }
}
