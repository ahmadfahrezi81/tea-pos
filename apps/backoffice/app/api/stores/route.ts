import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { TenantStoreListResponse } from "@tea-pos/features/stores/schema";
import { listTenantStores } from "@tea-pos/services/stores";
import { ok, err, unauthorized, handleError } from "@/lib/api/response";

/**
 * The tenant's stores, for the home screen's store filter — demo and retired
 * ones included, since the picker's toggle is what decides whether they show.
 * Tenant comes from the cookie: this runs on the service-role key, so that
 * filter is the only isolation there is.
 */
export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const data = await listTenantStores(getServiceClient(), {
            tenantId: await getCurrentTenantId(),
        });

        const parsed = TenantStoreListResponse.safeParse(data);
        if (!parsed.success) return err("Invalid response shape");

        return ok(parsed.data);
    } catch (error) {
        return handleError("GET /api/stores", error);
    }
}
