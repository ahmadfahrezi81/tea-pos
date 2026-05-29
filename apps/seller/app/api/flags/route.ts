import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getAllFlags } from "@/lib/flags";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const tenantId = await getCurrentTenantId();
        const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
        const props = { role: user.role, tenantId, ...(storeId && { storeId }) };

        const flags = await getAllFlags(user.id, props);

        return ok({
            qris: flags.isEnabled("qris"),
            payroll: flags.isEnabled("payroll"),
            reimbursement: flags.isEnabled("reimbursement"),
            skipManagePhotos: flags.isEnabled("skip-manage-photos"),
        });
    } catch (error) {
        return handleError("GET /api/flags", error);
    }
}
