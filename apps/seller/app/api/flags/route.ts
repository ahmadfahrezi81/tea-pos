import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth/get-request-user";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { getAllFlags, FLAGS } from "@/lib/flags";
import { ok, unauthorized, handleError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const tenantId = await getCurrentTenantId();
        const storeId = new URL(request.url).searchParams.get("storeId") ?? undefined;
        const props = { role: user.role, tenantId, ...(storeId && { storeId }) };

        const evaluation = await getAllFlags(user.id, props);

        return ok({
            isQrisEnabled: evaluation.isEnabled(FLAGS.FEATURE.QRIS),
            isReportEnabled: evaluation.isEnabled(FLAGS.FEATURE.REPORT),
            isRequestEnabled: evaluation.isEnabled(FLAGS.FEATURE.REQUEST),
            isPayEnabled: evaluation.isEnabled(FLAGS.FEATURE.PAY),
            isClaimsEnabled: evaluation.isEnabled(FLAGS.FEATURE.CLAIMS),
            isFastOrderEnabled: evaluation.isEnabled(FLAGS.FEATURE.FAST_ORDER),
            isSkipManagePhotosEnabled: evaluation.isEnabled(FLAGS.OPS.SKIP_MANAGE_PHOTOS),
            isMaintenanceEnabled: evaluation.isEnabled(FLAGS.OPS.MAINTENANCE),
        });
    } catch (error) {
        return handleError("GET /api/flags", error);
    }
}
