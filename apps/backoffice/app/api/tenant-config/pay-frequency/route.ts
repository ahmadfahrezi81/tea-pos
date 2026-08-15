import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { UpdateTenantPayFrequencyInput, TenantPayFrequencyResponse } from "@tea-pos/features/tenants/schema";
import { getTenantPayFrequency, setTenantPayFrequency } from "@tea-pos/services/tenants";
import { ok, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { revalidatePath } from "next/cache";

export async function GET() {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const frequency = await getTenantPayFrequency(getServiceClient(), await getCurrentTenantId());
        return ok(TenantPayFrequencyResponse.parse({ payFrequency: frequency }));
    } catch (error) { return handleError("GET /api/tenant-config/pay-frequency", error); }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const body = UpdateTenantPayFrequencyInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const tenantId = await getCurrentTenantId();
        await setTenantPayFrequency(getServiceClient(), tenantId, body.data.payFrequency);

        // The cadence is server-rendered into PayFrequencyProvider by the mobile
        // layout, so without this the app keeps showing windows from the old
        // schedule until a hard reload.
        revalidatePath("/[tenantSlug]/mobile", "layout");

        return ok(TenantPayFrequencyResponse.parse({ payFrequency: body.data.payFrequency }));
    } catch (error) { return handleError("PATCH /api/tenant-config/pay-frequency", error); }
}
