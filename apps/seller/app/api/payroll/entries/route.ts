import { getServiceClient } from "@/lib/supabase/service";
import { getCurrentTenantId } from "@tea-pos/utils/server-config/tenant";
import { NextRequest } from "next/server";
import { ListPayrollEntriesQuery, PayrollEntryListResponse } from "@tea-pos/features/payroll/schema";
import { listPayrollEntries } from "@tea-pos/services/payroll";
import { ok, badRequest, forbidden, unauthorized, handleError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth/get-request-user";

export async function GET(request: NextRequest) {
    try {
        const user = await getRequestUser();
        if (!user) return unauthorized();

        const supabase = getServiceClient();
        const tenantId = await getCurrentTenantId();

        const query = ListPayrollEntriesQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
        if (!query.success) return badRequest("Invalid query parameters");

        if (user.role !== "ADMIN" && query.data.userId && query.data.userId !== user.id) {
            return forbidden("You can only view your own payroll entries");
        }

        const entries = await listPayrollEntries(supabase, { tenantId, ...query.data });

        const parsed = PayrollEntryListResponse.safeParse({ entries });
        if (!parsed.success) return ok({ entries });

        return ok(parsed.data);
    } catch (error) { return handleError("GET /api/payroll/entries", error); }
}
