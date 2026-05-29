import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { isFlagEnabled } from "@/lib/flags";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const tenantId = await getCurrentTenantId();
        const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
        const props = { role: user.role, tenantId, ...(storeId && { storeId }) };

        const [qris, payroll, reimbursement, skipManagePhotos] = await Promise.all([
            isFlagEnabled("qris", user.id, props),
            isFlagEnabled("payroll", user.id, props),
            isFlagEnabled("reimbursement", user.id, props),
            isFlagEnabled("skip-manage-photos", user.id, props),
        ]);

        return ok({ qris, payroll, reimbursement, skipManagePhotos });
    } catch (error) {
        return handleError("GET /api/flags", error);
    }
}
