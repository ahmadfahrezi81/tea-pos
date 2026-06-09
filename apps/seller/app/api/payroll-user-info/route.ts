import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    UpdatePayrollUserInfoInput,
    PayrollUserInfoResponse,
} from "@tea-pos/features/payroll-user-info/schema";
import { getPayrollUserInfo, upsertPayrollUserInfo } from "@tea-pos/services/payroll-user-info";
import { ok, err, badRequest, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(_request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const info = await getPayrollUserInfo(supabase, { tenantId, userId: user.id });
        if (!info) return ok(null);

        const parsed = PayrollUserInfoResponse.safeParse(info);
        return ok(parsed.success ? parsed.data : info);
    } catch (error) {
        return handleError("GET /api/payroll-user-info", error);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        // Staff can only update bank fields — not rate or commission type
        const body = UpdatePayrollUserInfoInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const info = await upsertPayrollUserInfo(supabase, {
            tenantId,
            userId: user.id,
            ...body.data,
        });

        const parsed = PayrollUserInfoResponse.safeParse(info);
        return ok(parsed.success ? parsed.data : info);
    } catch (error) {
        return handleError("PUT /api/payroll-user-info", error);
    }
}
