import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { getServiceClient } from "@/lib/supabase/service";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { SetDefaultStoreInput } from "@tea-pos/features/stores/schema";
import { setDefaultStore } from "@tea-pos/services/stores";
import { ok, badRequest, unauthorized, handleError } from "@/lib/api/response";

/**
 * Which store this user's app opens on — task 064.
 *
 * The store id arrives in the body, so the service re-derives the user and the
 * tenant from the session and the cookie and checks the id against the caller's
 * own assignments before writing. This route runs on the service-role key, where
 * RLS does not apply, so that check is the only thing standing between a seller
 * and another tenant's store.
 */
export async function PUT(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const body = SetDefaultStoreInput.safeParse(
            await request.json().catch(() => null),
        );
        if (!body.success) return badRequest("Invalid request body");

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        await setDefaultStore(supabase, {
            tenantId,
            userId: user.id,
            storeId: body.data.storeId,
        });

        /* The mobile layout reads this list through `unstable_cache` for 60s and
           seeds it into SWR, where `useStores` never revalidates a stale entry.
           Without this, reloading inside that window hands the client the old
           `is_default` and the user's own choice snaps back — on the device that
           made it. */
        revalidateTag(`user-stores-${tenantId}`, "max");

        return ok({ success: true });
    } catch (error) {
        return handleError("PUT /api/stores/default", error);
    }
}
