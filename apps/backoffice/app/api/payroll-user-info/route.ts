import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import {
    GetPayrollUserInfoQuery,
    AdminUpdatePayrollUserInfoInput,
    PayrollUserInfoResponse,
} from "@tea-pos/features/payroll-user-info/schema";
import { getPayrollUserInfo, listPayrollUserInfos, upsertPayrollUserInfo } from "@tea-pos/services/payroll-user-info";
import { ok, err, badRequest, unauthorized, forbidden, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = GetPayrollUserInfoQuery.safeParse(
            Object.fromEntries(new URL(request.url).searchParams),
        );
        if (!query.success) return badRequest("Invalid query parameters");

        const targetUserId = query.data.userId;

        if (!targetUserId) {
            const infos = await listPayrollUserInfos(supabase, { tenantId });
            return ok({ infos });
        }

        const info = await getPayrollUserInfo(supabase, { tenantId, userId: targetUserId });
        if (!info) return err("Payroll info not found", 404);

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
        if (user.role !== "ADMIN") return forbidden();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const body = AdminUpdatePayrollUserInfoInput.safeParse(await request.json());
        if (!body.success) return badRequest("Validation failed");

        const searchParams = Object.fromEntries(new URL(request.url).searchParams);
        const query = GetPayrollUserInfoQuery.safeParse(searchParams);
        if (!query.success || !query.data.userId) return badRequest("userId is required");

        await upsertPayrollUserInfo(supabase, {
            tenantId,
            userId: query.data.userId,
            ...body.data,
        });

        const info = await getPayrollUserInfo(supabase, { tenantId, userId: query.data.userId });
        const parsed = PayrollUserInfoResponse.safeParse(info);
        return ok(parsed.success ? parsed.data : info);
    } catch (error) {
        return handleError("PUT /api/payroll-user-info", error);
    }
}
