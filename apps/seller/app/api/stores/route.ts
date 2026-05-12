import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { StoreListResponse } from "@tea-pos/features/stores/schema";
import { listUserStores } from "@tea-pos/services/stores";
import { ok, err, unauthorized, handleError } from "@/lib/api/response";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const data = await listUserStores(supabase, { tenantId, userId: user.id });
        const parsed = StoreListResponse.safeParse(data);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/stores", error);
    }
}
